from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from src.models.enums import SeniorityLevel, JobCategory

# Base model for a job
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


# Model for creating a job
class JobCreate(JobBase):
    scraped_at: datetime = Field(default_factory=datetime.utcnow)


# Model for enriching a job
class JobEnrichment(BaseModel):
    normalized_skills: list[str] = Field(default_factory=list)
    seniority: Optional[SeniorityLevel] = None
    category: Optional[JobCategory] = None
    salary_estimate: Optional[float] = None
    enriched_at: Optional[datetime] = None


# Model for a job in the database
class JobInDB(JobBase):
    id: str = Field(alias="_id")
    scraped_at: datetime
    normalized_skills: list[str] = Field(default_factory=list)
    seniority: Optional[SeniorityLevel] = None
    category: Optional[JobCategory] = None
    salary_estimate: Optional[float] = None
    enriched_at: Optional[datetime] = None

    model_config = {"populate_by_name": True}


# Model for a job response
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


# Model for a paginated jobs response
class PaginatedJobsResponse(BaseModel):
    jobs: list[JobResponse]
    page: int
    per_page: int
    total: int
    total_pages: int
