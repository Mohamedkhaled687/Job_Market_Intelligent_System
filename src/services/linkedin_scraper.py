import logging
import time
from datetime import datetime
from typing import Iterator

import httpx

from src.models.schemas import JobCreate
from src.utils.config import get_settings

logger = logging.getLogger(__name__)

LINKEDIN_DEFAULT_PATH = "/search-jobs"
LINKEDIN_TIMEOUT = 60


def scrape_linkedin_sync(
    keywords: list[str] | None = None,
    max_pages: int | None = None,
    on_progress=None,
) -> Iterator[JobCreate]:
    """Fetch LinkedIn jobs via a third-party API and yield JobCreate models."""

    settings = get_settings()
    if not settings.linkedin_rapidapi_key or not settings.linkedin_rapidapi_host:
        raise RuntimeError(
            "LinkedIn scraping requires LINKEDIN_RAPIDAPI_KEY and LINKEDIN_RAPIDAPI_HOST."
        )

    query = " ".join(keywords) if keywords else "software"
    max_pages = max_pages or 1
    api_url = f"https://{settings.linkedin_rapidapi_host}{LINKEDIN_DEFAULT_PATH}"

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

                jobs_data = _extract_jobs(response.json())
                page_count = 0
                for item in jobs_data:
                    job = _map_job(item)
                    if not job.title or not job.source_url:
                        continue
                    yield job
                    page_count += 1

                if on_progress:
                    on_progress(page=page_num + 1, count=page_count)

                time.sleep(2)
            except Exception as exc:
                logger.warning("Error fetching LinkedIn jobs: %s", exc, exc_info=True)
                if on_progress:
                    on_progress(page=page_num + 1, error=True)


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

    source_url = (
        item.get("url")
        or item.get("jobUrl")
        or item.get("link")
        or item.get("applyUrl")
        or ""
    )

    location = item.get("location") or item.get("jobLocation") or item.get("city") or ""
    job_type = item.get("employmentType") or item.get("jobType") or item.get("employment_type") or ""
    description = item.get("description") or item.get("jobDescription") or item.get("text") or ""

    return JobCreate(
        source="linkedin",
        source_url=source_url,
        title=str(item.get("title") or item.get("jobTitle") or ""),
        company=company_name,
        location=str(location),
        experience_range=str(item.get("experience") or item.get("experienceLevel") or ""),
        job_type=str(job_type),
        description_text=str(description),
        listed_skills=[],
        posted_date=_parse_datetime(
            item.get("postedDate") or item.get("date") or item.get("createdAt") or item.get("listedAt")
        ),
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