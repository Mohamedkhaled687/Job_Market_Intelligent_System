import re
import time
from datetime import datetime, timedelta
from typing import Iterator

from scrapling.fetchers import Fetcher

from src.models.schemas import JobCreate
from src.utils.config import get_settings

BASE_URL = "https://wuzzuf.net/search/jobs/"


def _parse_date(text: str) -> datetime | None:
    """
    Parses the date from the text (human readable date) and converts it to a datetime object. 

    Args:
        text: The text to parse the date from.

    Returns:
        The date if it was parsed successfully, otherwise None.

    Examples:
        >>> _parse_date("Today")
        datetime.datetime(2026, 2, 26, 0, 0)
        >>> _parse_date("1 day ago")
        datetime.datetime(2026, 2, 25, 0, 0)
        >>> _parse_date("2 months ago")
        datetime.datetime(2026, 0, 26, 0, 0)
    """


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


def scrape_wuzzuf_sync(
    keywords: list[str] | None = None,
    max_pages: int | None = None,
    on_progress=None,
) -> Iterator[JobCreate]:
    """
    Scrapes the Wuzzuf job board for jobs.

    Args:
        keywords: The keywords to search for.
        max_pages: The maximum number of pages to scrape.
        on_progress: A callback function to call on progress.

    Returns:
        An iterator of JobCreate objects that represent the jobs found on the Wuzzuf job board.

    Examples:
        >>> list(scrape_wuzzuf_sync())
        [<JobCreate(source='wuzzuf', source_url='https://wuzzuf.net/jobs/software-engineer-jobs', title='Software Engineer', company='Google', location='', experience_range='', job_type='', description_text='', listed_skills=['Python', 'JavaScript', 'SQL'], posted_date=datetime.datetime(2026, 2, 26, 0, 0), scraped_at=datetime.datetime(2026, 2, 26, 0, 0))>
        <JobCreate(source='wuzzuf', source_url='https://wuzzuf.net/jobs/software-engineer-jobs', title='Software Engineer', company='Google', location='', experience_range='', job_type='', description_text='', listed_skills=['Python', 'JavaScript', 'SQL'], posted_date=datetime.datetime(2026, 2, 26, 0, 0), scraped_at=datetime.datetime(2026, 2, 26, 0, 0))>
        <JobCreate(source='wuzzuf', source_url='https://wuzzuf.net/jobs/software-engineer-jobs', title='Software Engineer', company='Google', location='', experience_range='', job_type='', description_text='', listed_skills=['Python', 'JavaScript', 'SQL'], posted_date=datetime.datetime(2026, 2, 26, 0, 0), scraped_at=datetime.datetime(2026, 2, 26, 0, 0))>
    """


    settings = get_settings()
    max_pages = max_pages or settings.scrape_max_pages
    delay = settings.scrape_delay_seconds
    query = "+".join(keywords) if keywords else "software"

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
                if job:
                    yield job
                    count += 1
            except Exception:
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
        for t in card.css("::text").getall()
        if t.strip() and not t.strip().startswith(".css-") and len(t.strip()) > 1
    ]
    # Typical pattern: [title, "Company -", "Location, Country", "X days ago"]
    # Remove the title from the list to get the rest
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
