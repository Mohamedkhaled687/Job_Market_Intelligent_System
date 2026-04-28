import chromadb
import logging

logger = logging.getLogger(__name__)

def search_database(user_query, n_results=4):
    """Searches ChromaDB and returns a list of matched courses."""
    logger.info(f"🔍 Searching ChromaDB for: '{user_query}'...")
    
    try:
        chroma_client = chromadb.PersistentClient(path="./chroma_db")
        collection = chroma_client.get_collection(name="fcc_youtube_courses")
        
        results = collection.query(
            query_texts=[user_query],
            n_results=n_results
        )
        
        matches = []
        if results['documents'] and results['documents'][0]:
            documents = results['documents'][0]
            metadatas = results['metadatas'][0]
            
            for i in range(len(documents)):
                matches.append({
                    "title": metadatas[i]['title'],
                    "url": metadatas[i]['url'],
                    "description": documents[i].replace('\n', ' ')[:150] # Snippet
                })
        return matches
        
    except Exception as e:
        logger.error(f"Error querying ChromaDB: {e}")
        return []

if __name__ == "__main__":
    # Test script still works if run manually
    test_query = "I want to learn how to build websites using React and JavaScript"
    print(search_database(test_query))