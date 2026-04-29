import asyncio
from src.models.database import connect_db, get_db
from src.rag_services.curriculum_fetcher import CurriculumFetcher

async def run():
    await connect_db()
    f = CurriculumFetcher(get_db())
    await f.sync()
    print('\n✅ MongoDB Sync Complete!')

asyncio.run(run())