from fastapi import APIRouter
from src.services.clustering_service import SkillClusteringService

router = APIRouter(prefix="/api/analysis", tags=["Advanced Data Analysis"])
