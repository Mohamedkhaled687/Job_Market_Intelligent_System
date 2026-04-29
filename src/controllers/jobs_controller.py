import math
from typing import Optional

from bson import ObjectId

from src.models.database import get_db
from src.models.schemas import JobResponse, PaginatedJobsResponse


def _serialize_job(doc: dict) -> JobResponse:
    return JobResponse(
        id=str(doc["_id"]),
        source=doc.get("source", ""),
        source_url=doc.get("source_url", ""),
        title=doc.get("title", ""),
        company=doc.get("company", ""),
        location=doc.get("location", ""),
        experience_range=doc.get("experience_range", ""),
        job_type=doc.get("job_type", ""),
        description_text=doc.get("description_text", ""),
        listed_skills=doc.get("listed_skills", []),
        posted_date=doc.get("posted_date"),
        scraped_at=doc.get("scraped_at"),
        normalized_skills=doc.get("normalized_skills", []),
        seniority=doc.get("seniority"),
        category=doc.get("category"),
        salary_estimate=doc.get("salary_estimate"),
        enriched_at=doc.get("enriched_at"),
    )


async def list_jobs(
    page: int = 1,
    per_page: int = 20,
    company: Optional[str] = None,
    location: Optional[str] = None,
    skill: Optional[str] = None,
    seniority: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "scraped_at",
) -> PaginatedJobsResponse:
    db = get_db()
    query: dict = {}

    if company:
        query["company"] = {"$regex": company, "$options": "i"}
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if skill:
        query["$or"] = [
            {"listed_skills": {"$regex": skill, "$options": "i"}},
            {"normalized_skills": {"$regex": skill, "$options": "i"}},
        ]
    if seniority:
        query["seniority"] = seniority
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"description_text": {"$regex": search, "$options": "i"}},
        ]

    sort_field = sort_by if sort_by in ("scraped_at", "posted_date", "company", "title") else "scraped_at"
    sort_direction = -1 if sort_field in ("scraped_at", "posted_date") else 1

    total = await db.jobs.count_documents(query)
    total_pages = max(1, math.ceil(total / per_page))
    skip = (page - 1) * per_page

    cursor = db.jobs.find(query).sort(sort_field, sort_direction).skip(skip).limit(per_page)
    docs = await cursor.to_list(length=per_page)

    return PaginatedJobsResponse(
        jobs=[_serialize_job(doc) for doc in docs],
        page=page,
        per_page=per_page,
        total=total,
        total_pages=total_pages,
    )


async def get_job_by_id(job_id: str) -> JobResponse | None:
    db = get_db()
    try:
        doc = await db.jobs.find_one({"_id": ObjectId(job_id)})
    except Exception:
        return None
    if not doc:
        return None
    return _serialize_job(doc)
