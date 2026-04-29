from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING, DESCENDING

from src.utils.config import get_settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """
    Connects to the MongoDB database.

    Args:
        None

    Returns:
        None
    """
    global _client, _db
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    _db = _client[settings.mongodb_db_name]
    await _create_indexes()


async def close_db() -> None:
    global _client, _db
    if _client:
        _client.close()
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    """
    Returns the MongoDB database. If the database is not initialised, it raises a RuntimeError.

    Args:
        None

    Returns:
        The MongoDB database.
    """
    if _db is None:
        raise RuntimeError("Database not initialised — call connect_db() first")
    return _db


async def _create_indexes() -> None:
    """
    Creates the indexes for the MongoDB database.

    Args:
        None

    Returns:
        None
    """
    db = get_db()

    await db.jobs.create_indexes([
        IndexModel([("source_url", ASCENDING)], unique=True),
        IndexModel([("company", ASCENDING), ("title", ASCENDING)]),
        IndexModel([("posted_date", DESCENDING)]),
        IndexModel([("location", ASCENDING)]),
        IndexModel([("listed_skills", ASCENDING)]),
        IndexModel([("normalized_skills", ASCENDING)]),
        IndexModel([("category", ASCENDING), ("seniority", ASCENDING)]),
        IndexModel([("scraped_at", DESCENDING)]),
    ])

    await db.crawl_logs.create_indexes([
        IndexModel([("started_at", DESCENDING)]),
    ])
