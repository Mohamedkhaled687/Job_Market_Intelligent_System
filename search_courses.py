import chromadb

def search_database(user_query, n_results=3):
    print(f"🔍 Searching for: '{user_query}'...\n")
    
    # 1. Connect to the local ChromaDB folder you just created
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    
    # 2. Get the collection
    collection = chroma_client.get_collection(name="fcc_youtube_courses")
    
    # 3. Perform the vector search
    # Chroma automatically converts your text query into a vector and finds the closest matches
    results = collection.query(
        query_texts=[user_query],
        n_results=n_results
    )
    
    # 4. Format and print the results
    documents = results['documents'][0]
    metadatas = results['metadatas'][0]
    distances = results['distances'][0] # Lower distance = closer match
    
    print("🎯 Top Matches Found:\n")
    for i in range(len(documents)):
        title = metadatas[i]['title']
        url = metadatas[i]['url']
        print(f"{i+1}. {title}")
        print(f"   Link: {url}")
        print(f"   Distance Score: {distances[i]:.4f}\n")

if __name__ == "__main__":
    # You can change this test query to anything you want!
    test_query = "I want to learn how to build websites using React and JavaScript"
    
    search_database(test_query)