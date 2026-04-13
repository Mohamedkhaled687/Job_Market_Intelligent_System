import logging
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Iterator

from scrapling.fetchers import Fetcher # fetchs pages with browser-like headers

from src.models.schemas import JobCreate
from src.utils.config import get_settings

logger = logging.getLogger(__name__)

BASE_URL = "https://wuzzuf.net/search/jobs/"

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
    try:
        page = Fetcher.get(source_url, stealthy_headers=True)
        if page.status != 200:
            logger.warning("Detail page returned %s for %s", page.status, source_url)
            return None
    except Exception:
        logger.warning("Failed to fetch detail page %s", source_url, exc_info=True)
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


def scrape_wuzzuf_sync(
    keywords: list[str] | None = None,
    max_pages: int | None = None,
    on_progress=None,
) -> Iterator[JobCreate]:
    """Scrape Wuzzuf search pages and, for each result, deep-scrape the detail page."""
    settings = get_settings()
    max_pages = max_pages or settings.scrape_max_pages
    delay = settings.scrape_delay_seconds
    detail_delay = settings.scrape_detail_delay_seconds
    query = "+".join(keywords) if keywords else "software"

    seen_urls: set[str] = set()

    for page_num in range(max_pages):
        url = f"{BASE_URL}?q={query}&start={page_num}"
        try:
            page = Fetcher.get(url, stealthy_headers=True)
            if page.status != 200:
                if on_progress:
                    on_progress(page=page_num + 1, error=True)
                continue
        except Exception:
            if on_progress:
                on_progress(page=page_num + 1, error=True)
            continue

        job_links = page.css('a[href*="/jobs/p/"]')
        if not job_links:
            break

        count = 0
        for link in job_links:
            try:
                job = _parse_card(link)
                if not job:
                    continue

                if job.source_url in seen_urls:
                    continue
                seen_urls.add(job.source_url)

                # Deep scrape: fetch the individual job detail page
                time.sleep(detail_delay)
                detail = _fetch_and_parse_detail(job.source_url)
                if detail:
                    desc = detail.description_text
                    if detail.salary_raw:
                        desc = f"Salary: {detail.salary_raw}\n\n{desc}"
                    job.description_text = desc
                    job.listed_skills = detail.listed_skills
                    if detail.experience_range:
                        job.experience_range = detail.experience_range
                    if detail.job_type:
                        job.job_type = detail.job_type

                yield job
                count += 1
            except Exception:
                logger.warning("Error processing card", exc_info=True)
                continue

        if on_progress:
            on_progress(page=page_num + 1, count=count)

        if page_num < max_pages - 1:
            time.sleep(delay)


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
