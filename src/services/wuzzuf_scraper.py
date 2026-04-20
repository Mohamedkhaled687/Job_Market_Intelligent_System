import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Iterator
from urllib.parse import quote_plus

import httpx

from scrapling.fetchers import Fetcher # fetchs pages with browser-like headers

from src.models.schemas import JobCreate
from src.utils.config import get_settings

logger = logging.getLogger(__name__)

BASE_URL = "https://wuzzuf.net/search/jobs/"

# Curated role queries covering every JobCategory enum value.
# Seniority tiers (junior/mid/senior/lead) arise naturally from each query's pages.
DEFAULT_QUERIES: list[str] = [
    "backend developer", "frontend developer", "full stack developer",
    "software engineer", "mobile developer", "android developer", "ios developer",
    "devops engineer", "sre",
    "data engineer", "data scientist", "data analyst",
    "ai engineer", "machine learning engineer",
    "qa engineer", "test engineer",
    "ui ux designer",
    "engineering manager", "tech lead",
]

_SECTION_HEADINGS = re.compile(
    r"(job\s+description|job\s+requirements|requirements|responsibilities"
    r"|qualifications|benefits|what\s+we\s+offer|about\s+the\s+role"
    r"|about\s+the\s+job|key\s+responsibilities)",
    re.IGNORECASE,
)

_CSS_NOISE = re.compile(r"\.css-[a-z0-9]+\{[^}]*\}", re.DOTALL)


def _is_css_or_noise(text: str) -> bool:
    """Return True if text looks like CSS declarations or boilerplate."""
    stripped = text.strip()
    if stripped.startswith(".css-") or stripped.startswith("{"):
        return True
    if "{" in stripped and "}" in stripped and ":" in stripped:
        return True
    return False


def _clean_text(text: str) -> str:
    """Remove inline CSS declarations that leak from <style> tags."""
    return _CSS_NOISE.sub("", text).strip()


def _parse_date(text: str) -> datetime | None:
    text = text.lower().strip()
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
    m = re.search(r"(\d+)\s+month", text)
    if m:
        return today - timedelta(days=int(m.group(1)) * 30)
    return None


_SALARY_PATTERN = re.compile(
    r"(?:EGP|USD|SAR|AED|egp|usd)\s*[\d,]+(?:\s*[-–]\s*[\d,]+)?",
    re.IGNORECASE,
)


@dataclass
class _DetailResult:
    description_text: str = ""
    listed_skills: list[str] = field(default_factory=list)
    experience_range: str = ""
    job_type: str = ""
    salary_raw: str = ""


def _fetch_and_parse_detail(source_url: str) -> _DetailResult | None:
    """Fetch a single Wuzzuf job-detail page and extract structured data."""
    settings = get_settings()
    timeout = float(settings.scrape_detail_timeout_seconds)
    t0 = time.monotonic()
    try:
        page = Fetcher.get(
            source_url,
            stealthy_headers=True,
            timeout=timeout,
        )
        if page.status != 200:
            logger.warning("Detail page returned %s for %s", page.status, source_url)
            return None
    except httpx.TimeoutException as exc:
        elapsed_ms = int((time.monotonic() - t0) * 1000)
        logger.warning(
            "Detail page timed out (timeout=%ss, waited ~%sms): %s",
            timeout,
            elapsed_ms,
            source_url,
        )
        return None
    except Exception as exc:
        elapsed_ms = int((time.monotonic() - t0) * 1000)
        logger.warning(
            "Failed to fetch detail page %s (after ~%sms)",
            source_url,
            elapsed_ms,
            exc_info=True,
        )
        return None

    return _parse_detail_page(page)


def _parse_detail_page(page) -> _DetailResult:
    """Parse the HTML of a Wuzzuf job detail page."""
    sections: dict[str, list[str]] = {}
    listed_skills: list[str] = []
    experience_range = ""
    job_type = ""

    # --- skills: collect from <a> tags whose href matches "/a/" (Wuzzuf skill filter URLs).
    # Filter out CSS noise, footer links ("jobs in ..."), and overly long strings.
    for a_tag in page.css('a[href^="/a/"]'):
        raw = a_tag.css("::text").get("").strip()
        skill = raw.lstrip("·").strip()
        if not skill or len(skill) <= 1 or len(skill) > 60:
            continue
        if _is_css_or_noise(skill):
            continue
        if re.search(r"jobs?\s+in\s+", skill, re.IGNORECASE):
            continue
        listed_skills.append(skill)

    # --- experience / job-type / salary badges on the detail header ---
    salary_raw = ""
    for span in page.css("span"):
        span_text = span.css("::text").get("").strip()
        if re.search(r"\d+\s*[-–]\s*\d+\s+Yrs?\s+of\s+Exp", span_text, re.IGNORECASE):
            experience_range = span_text
        elif re.search(r"\d+\+?\s+Yrs?\s+of\s+Exp", span_text, re.IGNORECASE):
            experience_range = span_text
        if span_text in ("Full Time", "Part Time", "Freelance", "Internship", "Contract", "Shift Based"):
            job_type = span_text
        if not salary_raw and _SALARY_PATTERN.search(span_text):
            salary_raw = span_text.strip()

    # --- main description / requirements / benefits sections ---
    # Strategy: iterate <h2> headings to delimit content sections, then grab
    # the text of all sibling elements until the next <h2>.
    h2_elements = page.css("h2")
    for h2 in h2_elements:
        heading_text = h2.css("::text").get("").strip()
        if not _SECTION_HEADINGS.search(heading_text):
            continue

        section_lines: list[str] = []
        sibling = h2

        while True:
            sibling = sibling.next
            if sibling is None:
                break
            tag_name = getattr(sibling, "tag", None) or ""
            if tag_name == "h2":
                break
            if tag_name == "style":
                continue
            text = " ".join(
                t.strip()
                for t in sibling.css("::text").get_all()
                if t.strip() and not _is_css_or_noise(t)
            )
            text = _clean_text(text)
            if text:
                section_lines.append(text)

        if section_lines:
            sections[heading_text] = section_lines

    # Build combined description_text from all captured sections.
    parts: list[str] = []
    for heading, lines in sections.items():
        parts.append(f"## {heading}")
        parts.extend(lines)
        parts.append("")

    # Fallback: if section-based parsing yielded nothing, grab all visible text
    # from the page body and strip navigation/footer boilerplate.
    if not parts:
        all_texts = [
            t.strip()
            for t in page.css("::text").get_all()
            if t.strip() and len(t.strip()) > 2 and not _is_css_or_noise(t)
        ]
        # Heuristic: drop everything before the job title (first <h1>) and after
        # "Featured Jobs" / "Similar Jobs" / "About ..." footer sections.
        start_idx = 0
        end_idx = len(all_texts)
        for i, t in enumerate(all_texts):
            if re.search(r"Featured Jobs|Similar Jobs|Find Related Jobs", t, re.IGNORECASE):
                end_idx = i
                break
        for i, t in enumerate(all_texts):
            if re.search(r"Job Description|Job Details", t, re.IGNORECASE):
                start_idx = i
                break
        parts = all_texts[start_idx:end_idx]

    description_text = "\n".join(parts).strip()

    # Deduplicate skills while preserving order
    seen: set[str] = set()
    unique_skills: list[str] = []
    for s in listed_skills:
        key = s.lower()
        if key not in seen:
            seen.add(key)
            unique_skills.append(s)

    return _DetailResult(
        description_text=description_text,
        listed_skills=unique_skills,
        experience_range=experience_range,
        job_type=job_type,
        salary_raw=salary_raw,
    )


def _merge_detail(job: JobCreate, detail: "_DetailResult | None") -> JobCreate:
    """Merge a `_DetailResult` into a `JobCreate` stub."""
    if not detail:
        return job
    desc = detail.description_text
    if detail.salary_raw:
        desc = f"Salary: {detail.salary_raw}\n\n{desc}"
    job.description_text = desc
    job.listed_skills = detail.listed_skills
    if detail.experience_range:
        job.experience_range = detail.experience_range
    if detail.job_type:
        job.job_type = detail.job_type
    return job


def scrape_wuzzuf_sync(
    keywords: list[str] | None = None,
    max_pages: int | None = None,
    on_progress=None,
) -> Iterator[JobCreate]:
    """Scrape Wuzzuf search pages for every query and deep-scrape each detail page.

    - `keywords` is treated as a list of independent search queries. If None,
      the curated `DEFAULT_QUERIES` (covering all `JobCategory` roles) is used.
    - `max_pages` overrides the per-query page cap (`scrape_pages_per_query`).
    - Detail pages are fetched concurrently via a thread pool for speed.
    """
    settings = get_settings()
    queries: list[str] = keywords or DEFAULT_QUERIES
    pages_per_query = max_pages or settings.scrape_pages_per_query
    search_delay = settings.scrape_delay_seconds
    workers = max(1, settings.scrape_detail_workers)
    list_timeout = float(settings.scrape_detail_timeout_seconds)

    seen_urls: set[str] = set()
    total_queries = len(queries)

    for q_idx, query in enumerate(queries, start=1):
        q_encoded = quote_plus(query)

        for page_num in range(pages_per_query):
            url = f"{BASE_URL}?q={q_encoded}&start={page_num}"
            try:
                page = Fetcher.get(url, stealthy_headers=True, timeout=list_timeout)
                if page.status != 200:
                    if on_progress:
                        on_progress(query=query, page=page_num + 1, error=True,
                                    queries_completed=q_idx - 1, total_queries=total_queries)
                    continue
            except Exception:
                if on_progress:
                    on_progress(query=query, page=page_num + 1, error=True,
                                queries_completed=q_idx - 1, total_queries=total_queries)
                continue

            job_links = page.css('a[href*="/jobs/p/"]')
            if not job_links:
                break

            # Parse cards into stubs first, deduping against seen_urls.
            stubs: list[JobCreate] = []
            for link in job_links:
                try:
                    stub = _parse_card(link)
                except Exception:
                    logger.warning("Error processing card", exc_info=True)
                    continue
                if not stub or stub.source_url in seen_urls:
                    continue
                seen_urls.add(stub.source_url)
                stubs.append(stub)

            # Parallel detail-page fetches.
            count = 0
            if stubs:
                with ThreadPoolExecutor(max_workers=workers) as pool:
                    futures = {
                        pool.submit(_fetch_and_parse_detail, s.source_url): s
                        for s in stubs
                    }
                    for fut in as_completed(futures):
                        stub = futures[fut]
                        try:
                            detail = fut.result()
                        except Exception:
                            logger.warning("Detail fetch failed for %s",
                                           stub.source_url, exc_info=True)
                            detail = None
                        yield _merge_detail(stub, detail)
                        count += 1

            if on_progress:
                on_progress(query=query, page=page_num + 1, count=count,
                            queries_completed=q_idx - 1, total_queries=total_queries)

            if page_num < pages_per_query - 1:
                time.sleep(search_delay)

        if on_progress:
            on_progress(query=query, queries_completed=q_idx,
                        total_queries=total_queries)


def _parse_card(link) -> JobCreate | None:
    title = link.css("::text").get("").strip()
    if not title:
        return None

    href = link.attrib.get("href", "")
    source_url = f"https://wuzzuf.net{href}" if href and not href.startswith("http") else href

    h2 = link.parent
    card = h2.parent if h2 else None
    if not card:
        return None

    texts = [
        t.strip()
        for t in card.css("::text").get_all()
        if t.strip() and not t.strip().startswith(".css-") and len(t.strip()) > 1
    ]
    remaining = [t for t in texts if t != title]

    company = ""
    location = ""
    date_text = ""

    for t in remaining:
        if re.search(r"\d+\s+(hour|day|month|year)s?\s+ago|today|just now", t, re.IGNORECASE):
            date_text = t
        elif not company:
            company = re.sub(r"\s*-\s*$", "", t).strip()
        elif not location:
            location = t

    posted_date = _parse_date(date_text)

    return JobCreate(
        source="wuzzuf",
        source_url=source_url,
        title=title,
        company=company,
        location=location,
        experience_range="",
        job_type="",
        description_text="",
        listed_skills=[],
        posted_date=posted_date,
        scraped_at=datetime.utcnow(),
    )
