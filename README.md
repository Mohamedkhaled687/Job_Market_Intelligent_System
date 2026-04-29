# Job_Market_Intelligent_System

## Overview

This is a job market intelligent system that uses AI to analyze the job market and provide insights to the user.

## Features

- Job market analysis
- Job market insights
- Job market trends
- Job market predictions
- Job market recommendations

***

### 🚀 How to Run the Application

**Step 1:** Navigate to the `docker` folder in your terminal.

**Step 2:** Run these commands in order to start the containers, fetch the YouTube playlists, and ingest them into the Vector Database:

```bash
# 1. Build and start all containers in the background
docker compose up --build -d

# 2. Scrape the freeCodeCamp YouTube playlists and save to MongoDB
docker compose exec api python -m src.rag_services.sync

# 3. Convert the MongoDB courses into vectors and save to ChromaDB
docker compose exec api python -m src.rag_services.ingest_courses
```

---

### 📋 How to View the Logs
If you ever need to see what is happening behind the scenes (or if you need to debug an error), you can check the logs for each specific service using these commands:

```bash
# View backend API logs
docker compose logs api

# View frontend React/Vite logs
docker compose logs frontend

# View database logs
docker compose logs mongodb
```
*(Tip: Add `-f` to the end of any of those commands, like `docker compose logs -f api`, to "follow" the logs and watch them update in real-time!)*

---

### 🌐 Next Steps / Using the App
* **Fetch Job Data:** Open the website in your browser. If your dashboard is empty, use the UI to trigger a data scrape (this is the first thing you should do after the containers start up).
* **Test the AI:** Once the YouTube data is synced and ingested, navigate to the Chatbot and ask for a Study Plan to see your RAG architecture in action!