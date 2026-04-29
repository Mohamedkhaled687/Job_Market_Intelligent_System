from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CrawlLogCreate(BaseModel):
    source: str = "wuzzuf"
    pages_scraped: int = 0
    jobs_found: int = 0
    errors: int = 0
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    status: str = "running"


class CrawlLogResponse(BaseModel):
    id: str
    source: str
    pages_scraped: int
    jobs_found: int
    errors: int
    started_at: datetime
    finished_at: Optional[datetime]
    status: str
