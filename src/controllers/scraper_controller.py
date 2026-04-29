import asyncio
import uuid
from datetime import datetime

from pymongo.errors import DuplicateKeyError

from src.models.database import get_db
from src.models.schemas import CrawlLogCreate
from src.services.wuzzuf_scraper import scrape_wuzzuf_sync
from src.services.Ai_Enrich_Service import extract_job_insights, estimate_salary
from src.utils.config import get_settings

_task_registry: dict[str, dict] = {}


async def enqueue_scrape(
    keywords: list[str] | None = None,
    max_pages: int | None = None,
) -> str:
    """
    Enqueues a scrape task.

    Args:
        keywords: The keywords to search for.
        max_pages: The maximum number of pages to scrape.

    Returns:
        The task ID.
    """
    task_id = str(uuid.uuid4())
    _task_registry[task_id] = {
        "status": "running",
        "pages_scraped": 0,
        "jobs_found": 0,
        "errors": 0,
        "current_query": None,
        "queries_completed": 0,
        "total_queries": 0,
        "started_at": datetime.utcnow().isoformat(),
        "finished_at": None,
    }
    return task_id


async def run_scrape(
    task_id: str,
    keywords: list[str] | None = None,
    max_pages: int | None = None,
) -> None:
    """
    Runs a scrape task.

    Args:
        task_id: The task ID.
        keywords: The keywords to search for.
        max_pages: The maximum number of pages to scrape.
    Returns:
        None
    """

    db = get_db()
    task = _task_registry[task_id]
    settings = get_settings()

    log = CrawlLogCreate(source="wuzzuf", started_at=datetime.utcnow())
    log_result = await db.crawl_logs.insert_one(log.model_dump())
    log_id = log_result.inserted_id

    errors = 0
    pages_scraped = 0

    def on_progress(
        query: str | None = None,
        page: int = 0,
        count: int = 0,
        error: bool = False,
        queries_completed: int = 0,
        total_queries: int = 0,
    ):
        nonlocal errors, pages_scraped
        if error:
            errors += 1
        if page:
            pages_scraped += 1
        if query is not None:
            task["current_query"] = query
        task["pages_scraped"] = pages_scraped
        task["errors"] = errors
        task["queries_completed"] = queries_completed
        task["total_queries"] = total_queries

    def _collect_jobs():
        return list(scrape_wuzzuf_sync(
            keywords=keywords,
            max_pages=max_pages,
            on_progress=on_progress,
        ))

    try:
        scraped_jobs = await asyncio.to_thread(_collect_jobs)
    except Exception:
        errors += 1
        task["errors"] = errors
        scraped_jobs = []

    # Parallel AI enrichment with a bounded semaphore to respect rate limits.
    sem = asyncio.Semaphore(max(1, settings.scrape_enrich_concurrency))

    async def _enrich_one(doc: dict) -> dict:
        async with sem:
            try:
                insights = await extract_job_insights(
                    description=doc.get("description_text", ""),
                    title=doc.get("title", ""),
                    location=doc.get("location", ""),
                )
            except Exception:
                insights = None

        if insights:
            doc["normalized_skills"] = insights.get("skills", [])
            seniority = insights.get("seniority") or "mid"
            category = insights.get("category") or "other"
            doc["seniority"] = seniority
            doc["category"] = category

            salary = insights.get("salary_estimate_usd")
            if not salary or salary <= 0:
                location_text = f"{doc.get('location', '')} {doc.get('description_text', '')}"
                salary = estimate_salary(seniority, category, location_text)
            doc["salary_estimate"] = salary
            doc["enriched_at"] = datetime.utcnow()
        return doc

    docs = [job.model_dump() for job in scraped_jobs]
    enriched_docs: list[dict] = []
    if docs:
        enriched_docs = await asyncio.gather(*[_enrich_one(d) for d in docs])

    jobs_inserted = 0
    for doc in enriched_docs:
        try:
            await db.jobs.insert_one(doc)
            jobs_inserted += 1
            task["jobs_found"] = jobs_inserted
        except DuplicateKeyError:
            pass
        except Exception:
            errors += 1
            task["errors"] = errors

    finished = datetime.utcnow()
    task.update({
        "status": "completed",
        "pages_scraped": pages_scraped,
        "jobs_found": jobs_inserted,
        "errors": errors,
        "finished_at": finished.isoformat(),
    })

    await db.crawl_logs.update_one(
        {"_id": log_id},
        {"$set": {
            "pages_scraped": pages_scraped,
            "jobs_found": jobs_inserted,
            "errors": errors,
            "finished_at": finished,
            "status": "completed",
        }},
    )


def get_task_status(task_id: str) -> dict | None:
    """
    Gets the status of a scrape task.

    Args:
        task_id: The task ID.

    Returns:
        The status of the task.
    """
    return _task_registry.get(task_id)


async def clear_jobs_and_logs() -> dict:
    """Drop all documents from the jobs and crawl_logs collections."""
    db = get_db()
    jobs_result = await db.jobs.delete_many({})
    logs_result = await db.crawl_logs.delete_many({})
    return {
        "jobs_deleted": jobs_result.deleted_count,
        "crawl_logs_deleted": logs_result.deleted_count,
    }
