import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from src.models.database import connect_db, close_db
from src.views.api.scraper_routes import router as scraper_router
from src.views.api.jobs_routes import router as jobs_router
from src.views.api.insights_routes import router as insights_router
from src.views.api.studyplan_routes import router as studyplan_router

FRONTEND_DIR = Path(__file__).parent / "src" / "views" / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Job Board Intelligence Platform",
    description="Scraping, analytics, and visualization for the Egyptian job market",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scraper_router)
app.include_router(jobs_router)
app.include_router(insights_router)
app.include_router(studyplan_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}


if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = FRONTEND_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))
