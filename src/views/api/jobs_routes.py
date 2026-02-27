from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from src.controllers import jobs_controller
from src.models.schemas import PaginatedJobsResponse, JobResponse

router = APIRouter(prefix="/api", tags=["Jobs"])


@router.get("/jobs", response_model=PaginatedJobsResponse)
async def list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    company: Optional[str] = None,
    location: Optional[str] = None,
    skill: Optional[str] = None,
    seniority: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("scraped_at"),
):
    return await jobs_controller.list_jobs(
        page=page,
        per_page=per_page,
        company=company,
        location=location,
        skill=skill,
        seniority=seniority,
        category=category,
        search=search,
        sort_by=sort_by,
    )


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    job = await jobs_controller.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
