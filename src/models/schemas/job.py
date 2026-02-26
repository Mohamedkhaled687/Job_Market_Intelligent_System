from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from src.models.enums import SeniorityLevel, JobCategory


class JobBase(BaseModel):
    source: str = "wuzzuf"
    source_url: str
    title: str
    company: str
    location: str = ""
    experience_range: str = ""
    job_type: str = ""
    description_text: str = ""
    listed_skills: list[str] = Field(default_factory=list)
    posted_date: Optional[datetime] = None


class JobCreate(JobBase):
    scraped_at: datetime = Field(default_factory=datetime.utcnow)


class JobEnrichment(BaseModel):
    normalized_skills: list[str] = Field(default_factory=list)
    seniority: Optional[SeniorityLevel] = None
    category: Optional[JobCategory] = None
    salary_estimate: Optional[float] = None
    enriched_at: Optional[datetime] = None


class JobInDB(JobBase):
    id: str = Field(alias="_id")
    scraped_at: datetime
    normalized_skills: list[str] = Field(default_factory=list)
    seniority: Optional[SeniorityLevel] = None
    category: Optional[JobCategory] = None
    salary_estimate: Optional[float] = None
    enriched_at: Optional[datetime] = None

    model_config = {"populate_by_name": True}


class JobResponse(BaseModel):
    id: str
    source: str
    source_url: str
    title: str
    company: str
    location: str
    experience_range: str
    job_type: str
    description_text: str
    listed_skills: list[str]
    posted_date: Optional[datetime]
    scraped_at: datetime
    normalized_skills: list[str]
    seniority: Optional[str]
    category: Optional[str]
    salary_estimate: Optional[float]
    enriched_at: Optional[datetime]


class PaginatedJobsResponse(BaseModel):
    jobs: list[JobResponse]
    page: int
    per_page: int
    total: int
    total_pages: int
