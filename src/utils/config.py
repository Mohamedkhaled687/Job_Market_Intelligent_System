from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "job_board_intelligence"
    openai_api_key: str = ""  # kept for backward compatibility
    google_api_key: str = ""  # read from GOOGLE_API_KEY
    scrape_max_pages: int = 5
    scrape_delay_seconds: float = 2.0
    scrape_detail_delay_seconds: float = 1.0
    scrape_detail_workers: int = 6
    scrape_detail_timeout_seconds: float = 45.0
    scrape_enrich_concurrency: int = 5
    scrape_pages_per_query: int = 3

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
