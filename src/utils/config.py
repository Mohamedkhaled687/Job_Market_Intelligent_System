from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "job_board_intelligence"
    openai_api_key: str = ""  # kept for backward compatibility
    google_api_key: str = ""  # read from GOOGLE_API_KEY
    ollama_api_url: str = "http://localhost:11434/api/generate"
    ollama_model: str = "qwen2.5"
    scrape_max_pages: int = 5
    scrape_delay_seconds: float = 4.0        # delay between list-page fetches
    scrape_detail_delay_seconds: float = 2.0 # delay between detail-page fetches
    scrape_detail_workers: int = 3           # parallel detail fetches (lower = fewer 429s)
    scrape_detail_timeout_seconds: float = 45.0
    scrape_enrich_concurrency: int = 3
    scrape_pages_per_query: int = 3

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
