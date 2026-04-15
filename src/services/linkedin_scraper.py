import logging
import re
import time
from datetime import datetime, timedelta
from urllib.parse import quote_plus
from typing import Iterator

import httpx

from src.models.schemas import JobCreate
from src.utils.config import get_settings

logger = logging.getLogger(__name__)

LINKEDIN_DEFAULT_PATH = "/search-jobs"
LINKEDIN_TIMEOUT = 60

_MULTISPACE_RE = re.compile(r"\s+")


def _clean_text(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return _MULTISPACE_RE.sub(" ", text)


def _first_non_empty(*values) -> str:
    for value in values:
        cleaned = _clean_text(value)
        if cleaned:
            return cleaned
    return ""


def _normalize_location(value) -> str:
    if isinstance(value, list):
        parts = [_clean_text(v) for v in value if _clean_text(v)]
        return ", ".join(parts)
    if isinstance(value, dict):
        return _first_non_empty(
            value.get("name"),
            value.get("city"),
            value.get("location"),
            value.get("country"),
        )
    return _clean_text(value)


def _parse_relative_date(value) -> datetime | None:
    text = _clean_text(value).lower()
    if not text:
        return None

    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if "today" in text or "just now" in text:
        return today

    m = re.search(r"(\d+)\s+hour", text)
    if m:
        return today

    m = re.search(r"(\d+)\s+day", text)
    if m:
        return today - timedelta(days=int(m.group(1)))

    m = re.search(r"(\d+)\s+week", text)
    if m:
        return today - timedelta(days=int(m.group(1)) * 7)

    m = re.search(r"(\d+)\s+month", text)
    if m:
        return today - timedelta(days=int(m.group(1)) * 30)

    return None


def scrape_linkedin_sync(
    keywords: list[str] | None = None,
    max_pages: int | None = None,
    on_progress=None,
) -> Iterator[JobCreate]:
    """Fetch LinkedIn jobs via Apify API actor and yield JobCreate models."""

    settings = get_settings()
    source_mode = (getattr(settings, "linkedin_source_mode", "apify") or "apify").strip().lower()
    
    strategies = []
    if source_mode == "apify":
        strategies = ["apify", "rapidapi"]
    else:
        strategies = ["rapidapi"]
    
    last_error: Exception | None = None
    for strategy in strategies:
        try:
            if strategy == "apify":
                iterator = _scrape_via_apify(keywords=keywords, max_pages=max_pages, on_progress=on_progress)
            else:
                iterator = _scrape_via_rapidapi(keywords=keywords, max_pages=max_pages, on_progress=on_progress)
            
            for job in iterator:
                yield job
            return
        except Exception as exc:
            last_error = exc
            logger.warning("LinkedIn strategy %s failed: %s", strategy, exc, exc_info=True)
    
    if last_error:
        raise RuntimeError(f"LinkedIn scraping failed across all strategies: {last_error}")
    raise RuntimeError("LinkedIn scraping returned no jobs from any source")


def _scrape_via_apify(
    keywords: list[str] | None = None,
    max_pages: int | None = None,
    on_progress=None,
) -> Iterator[JobCreate]:
    """Scrape LinkedIn jobs using Apify's LinkedIn Jobs actor."""
    try:
        from apify_client import ApifyClient
    except ImportError:
        raise RuntimeError("apify-client is not installed")
    
    settings = get_settings()
    api_token = settings.apify_api_token or ""
    if not api_token.strip():
        raise RuntimeError("APIFY_API_TOKEN is not set in .env")
    
    query = " ".join(keywords) if keywords else "Data Engineer"
    max_pages = max_pages or 1
    page_size = int(getattr(settings, "linkedin_limit", 10) or 10)
    if page_size <= 0:
        page_size = 10
    
    client = ApifyClient(api_token)
    actor = client.actor("curious_coder/linkedin-jobs-scraper")
    search_url = (
        "https://www.linkedin.com/jobs/search/?"
        f"keywords={quote_plus(query)}"
        "&location=Egypt"
        "&f_TPR=r86400"
    )

    actor_call = actor.call(run_input={"urls": [search_url], "maxItems": page_size * max_pages})

    if on_progress:
        on_progress(page=1, count=0)

    jobs_count = 0
    for dataset_item in client.dataset(actor_call["defaultDatasetId"]).iterate_items():
        job = _map_apify_job(dataset_item)
        if job and job.title and job.source_url:
            yield job
            jobs_count += 1
            if on_progress:
                on_progress(page=1, count=1)

    if jobs_count == 0 and on_progress:
        on_progress(page=1, count=0)


def _scrape_via_rapidapi(
    keywords: list[str] | None = None,
    max_pages: int | None = None,
    on_progress=None,
) -> Iterator[JobCreate]:
    settings = get_settings()
    if not settings.linkedin_rapidapi_key or not settings.linkedin_rapidapi_host:
        raise RuntimeError(
            "LinkedIn scraping requires LINKEDIN_RAPIDAPI_KEY and LINKEDIN_RAPIDAPI_HOST."
        )

    query = " ".join(keywords) if keywords else "software"
    max_pages = max_pages or 1
    request_delay = max(0.0, float(getattr(settings, "linkedin_request_delay_seconds", 0.5)))
    api_path = settings.linkedin_rapidapi_path or LINKEDIN_DEFAULT_PATH
    if not api_path.startswith("/"):
        api_path = f"/{api_path}"
    api_url = f"https://{settings.linkedin_rapidapi_host}{api_path}"

    headers = {
        "X-RapidAPI-Key": settings.linkedin_rapidapi_key,
        "X-RapidAPI-Host": settings.linkedin_rapidapi_host,
    }

    with httpx.Client(timeout=LINKEDIN_TIMEOUT, headers=headers) as client:
        for page_num in range(max_pages):
            try:
                response = client.get(
                    api_url,
                    params={"keyword": query, "page": str(page_num + 1)},
                )
                response.raise_for_status()

                payload = response.json()
                _raise_if_provider_error(payload)

                jobs_data = _extract_jobs(payload)
                page_count = 0
                for item in jobs_data:
                    job = _map_job(item)
                    if not job.title or not job.source_url:
                        continue
                    yield job
                    page_count += 1
                    if on_progress:
                        # Emit per-job progress so the frontend can update every poll cycle.
                        on_progress(page=page_num + 1, count=1)

                if on_progress and page_count == 0:
                    on_progress(page=page_num + 1, count=0)

                time.sleep(request_delay)
            except Exception as exc:
                logger.warning("Error fetching LinkedIn jobs: %s", exc, exc_info=True)
                if on_progress:
                    on_progress(page=page_num + 1, error=True)


def _map_apify_job(item: dict) -> JobCreate:
    """Map Apify LinkedIn Jobs actor output to JobCreate schema."""
    if not isinstance(item, dict):
        return None
    
    title = _first_non_empty(item.get("title"), item.get("positionName"), item.get("jobTitle"))
    company = _first_non_empty(item.get("companyName"), item.get("company"), item.get("organizationName"))
    url = _first_non_empty(item.get("link"), item.get("url"), item.get("jobUrl"), item.get("jobUrlDirect"))
    location = _normalize_location(item.get("location") or item.get("jobLocation") or item.get("locations"))
    description = _first_non_empty(item.get("description"), item.get("jobDescription"), item.get("htmlDescription"))
    seniority = _first_non_empty(item.get("seniority"), item.get("level"), item.get("experienceLevel"))
    job_type = _first_non_empty(item.get("jobType"), item.get("employmentType"), item.get("employment_type"))
    posted_date_str = item.get("postedDate") or item.get("date_posted") or item.get("posted_at") or ""
    
    if not title or not url:
        return None
    
    return JobCreate(
        source="linkedin",
        source_url=url,
        title=title,
        company=company,
        location=location,
        experience_range=seniority,
        job_type=job_type,
        description_text=description,
        listed_skills=[],
        posted_date=_parse_datetime(posted_date_str) or _parse_relative_date(posted_date_str),
        scraped_at=datetime.utcnow(),
    )


def _raise_if_provider_error(payload) -> None:
    """Normalize common RapidAPI failure shapes into explicit exceptions."""
    if not isinstance(payload, dict):
        return

    success = payload.get("success")
    message = payload.get("message")

    if success is False:
        raise RuntimeError(message or "RapidAPI provider returned success=false")

    if isinstance(message, str):
        lowered = message.lower()
        if "no longer providing this service" in lowered:
            raise RuntimeError(message)
        if "endpoint is disabled for your subscription" in lowered:
            raise RuntimeError(message)


def _extract_jobs(payload) -> list[dict]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]

    if not isinstance(payload, dict):
        return []

    for key in ("data", "jobs", "results", "items", "jobData"):
        value = payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]

    nested = payload.get("data")
    if isinstance(nested, dict):
        for key in ("jobs", "results", "items"):
            value = nested.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]

    return []


def _map_job(item: dict) -> JobCreate:
    company = item.get("company")
    if isinstance(company, dict):
        company_name = company.get("name", "")
    else:
        company_name = str(company or item.get("companyName") or item.get("company_name") or "")

    source_url = _first_non_empty(
        item.get("url"),
        item.get("jobUrl"),
        item.get("link"),
        item.get("applyUrl"),
    )

    location = _normalize_location(item.get("location") or item.get("jobLocation") or item.get("city"))
    job_type = _first_non_empty(item.get("employmentType"), item.get("jobType"), item.get("employment_type"))
    description = _first_non_empty(item.get("description"), item.get("jobDescription"), item.get("text"))
    title = _first_non_empty(item.get("title"), item.get("jobTitle"))
    experience_range = _first_non_empty(item.get("experience"), item.get("experienceLevel"), item.get("seniority"))
    posted_value = item.get("postedDate") or item.get("date") or item.get("createdAt") or item.get("listedAt")

    return JobCreate(
        source="linkedin",
        source_url=source_url,
        title=title,
        company=_clean_text(company_name),
        location=location,
        experience_range=experience_range,
        job_type=job_type,
        description_text=description,
        listed_skills=[],
        posted_date=_parse_datetime(posted_value) or _parse_relative_date(posted_value),
        scraped_at=datetime.utcnow(),
    )


def _parse_datetime(value) -> datetime | None:
    if not value:
        return None

    if isinstance(value, datetime):
        return value

    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None

        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None

    return None