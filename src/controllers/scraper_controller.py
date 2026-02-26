import asyncio
import uuid
from datetime import datetime

from pymongo.errors import DuplicateKeyError

from src.models.database import get_db
from src.models.schemas import CrawlLogCreate
from src.services.wuzzuf_scraper import scrape_wuzzuf_sync
from src.services.openai_service import extract_job_insights

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

    log = CrawlLogCreate(source="wuzzuf", started_at=datetime.utcnow())
    log_result = await db.crawl_logs.insert_one(log.model_dump())
    log_id = log_result.inserted_id

    jobs_inserted = 0
    errors = 0

    def on_progress(page: int = 0, count: int = 0, error: bool = False):
        nonlocal errors
        if error:
            errors += 1
        task["pages_scraped"] = page
        task["errors"] = errors

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

    for job in scraped_jobs:
        doc = job.model_dump()

        try:
            insights = await extract_job_insights(
                description=doc.get("description_text", ""),
                title=doc.get("title", ""),
            )
            if insights:
                doc["normalized_skills"] = insights.get("skills", [])
                doc["seniority"] = insights.get("seniority")
                doc["category"] = insights.get("category")
                doc["salary_estimate"] = insights.get("salary_estimate_usd")
                doc["enriched_at"] = datetime.utcnow()
        except Exception:
            pass

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
        "pages_scraped": task.get("pages_scraped", 0),
        "jobs_found": jobs_inserted,
        "errors": errors,
        "finished_at": finished.isoformat(),
    })

    await db.crawl_logs.update_one(
        {"_id": log_id},
        {"$set": {
            "pages_scraped": task.get("pages_scraped", 0),
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
