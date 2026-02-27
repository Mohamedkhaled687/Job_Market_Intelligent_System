from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from src.controllers import scraper_controller

router = APIRouter(prefix="/scrape", tags=["Scraper"])


class ScrapeRequest(BaseModel):
    keywords: Optional[list[str]] = None
    max_pages: Optional[int] = None


class ScrapeResponse(BaseModel):
    task_id: str
    status: str


@router.post("/jobs", status_code=202, response_model=ScrapeResponse)
async def trigger_scrape(request: ScrapeRequest, background_tasks: BackgroundTasks):
    task_id = await scraper_controller.enqueue_scrape(
        keywords=request.keywords,
        max_pages=request.max_pages,
    )
    background_tasks.add_task(
        scraper_controller.run_scrape,
        task_id,
        request.keywords,
        request.max_pages,
    )
    return ScrapeResponse(task_id=task_id, status="running")


@router.get("/status/{task_id}")
async def scrape_status(task_id: str):
    status = scraper_controller.get_task_status(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task_id": task_id, **status}
