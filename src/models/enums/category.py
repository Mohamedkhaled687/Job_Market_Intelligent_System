from enum import Enum


class JobCategory(str, Enum):
    BACKEND = "backend"
    FRONTEND = "frontend"
    AI = "ai"
    FULLSTACK = "fullstack"
    DATA = "data"
    DEVOPS = "devops"
    MOBILE = "mobile"
    DESIGN = "design"
    MANAGEMENT = "management"
    QA = "qa"
    OTHER = "other"
