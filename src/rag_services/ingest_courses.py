import asyncio
import chromadb
from src.models.database import connect_db, get_db, close_db
from src.rag_services.curriculum_fetcher import CurriculumFetcher
async def ingest_to_chroma():
    print("1. Connecting to MongoDB...")
    await connect_db()
    db = get_db()
    fetcher = CurriculumFetcher(db)

    print("2. Fetching courses from MongoDB...")
    courses = await fetcher.get_courses_for_embedding()
    print(f"   Found {len(courses)} courses.")

    print("3. Initializing ChromaDB...")
    # Since the script is in the root folder, it creates chroma_db right here
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    
    collection = chroma_client.get_or_create_collection(name="fcc_youtube_courses")

    print("4. Preparing data for vectorization...")
    documents = []
    metadatas = []
    ids = []

    for course in courses:
        doc_id = str(course.get("courseId"))
        title = course.get("title", "")
        desc = course.get("description", "")
        
        text_to_embed = f"Title: {title}\nDescription: {desc}"
        
        documents.append(text_to_embed)
        metadatas.append({"title": title, "url": course.get("url", "")})
        ids.append(doc_id)

    print("5. Embedding and saving to ChromaDB... (This will take a moment)")
    collection.upsert(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

    print("\n✅ Successfully vectorized and stored all courses in ChromaDB!")
    await close_db()

if __name__ == "__main__":
    asyncio.run(ingest_to_chroma())