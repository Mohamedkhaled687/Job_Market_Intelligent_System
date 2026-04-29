# test_sync.py
import asyncio
from src.models.database import connect_db, get_db, close_db
from src.rag_services.curriculum_fetcher import CurriculumFetcher

async def test():
    print("1. Connecting to MongoDB...")
    await connect_db()
    db = get_db()
    print("   Connected!")
    
    print("2. Creating fetcher...")
    fetcher = CurriculumFetcher(db)
    print("   Fetcher created")
    
    print("3. Running sync...")
    result = await fetcher.sync(full_refresh=True)
    
    print(f"\n4. Result: {result}")
    
    print("\n5. Courses in database:")
    courses = await fetcher.get_courses_for_embedding()
    for i, course in enumerate(courses[:10], 1):
        print(f"   {i}. {course.get('title')}")
    
    if len(courses) > 10:
        print(f"   ... and {len(courses) - 10} more")
    
    await close_db()
    print("\nDone!")

if __name__ == "__main__":
    asyncio.run(test())