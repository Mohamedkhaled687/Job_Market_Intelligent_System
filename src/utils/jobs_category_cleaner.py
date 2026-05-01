import argparse
import json
import re
from collections import Counter
from dataclasses import dataclass

from pymongo import MongoClient, UpdateOne


CATEGORY_PRIORITY = [
    "cybersecurity",
    "ai",
    "data",
    "devops",
    "backend",
    "frontend",
    "fullstack",
    "mobile",
    "qa",
    "design",
    "management",
]

KEYWORDS = {
    "cybersecurity": [
        "cybersecurity", "cyber security", "information security", "security engineer",
        "security analyst", "soc analyst", "security operations center", "siem engineer",
        "siem administrator", "siem platform", "blue team", "red team", "incident response",
        "penetration", "pentest", "ethical hacking", "appsec", "application security",
        "cloud security", "threat intelligence", "threat hunting", "vulnerability",
        "digital forensics", "iam", "identity access management", "network security",
    ],
    "ai": [
        "artificial intelligence", "machine learning", "deep learning", "nlp", "llm",
        "computer vision", "genai", "prompt engineering", "ml engineer",
    ],
    "data": [
        "data scientist", "data engineer", "data analyst", "etl", "data warehouse",
        "bi developer", "power bi", "tableau", "analytics",
    ],
    "devops": [
        "devops", "sre", "site reliability", "kubernetes", "docker", "terraform",
        "ansible", "jenkins", "ci/cd", "infrastructure engineer", "platform engineer",
        "system administrator", "sysadmin", "network administrator", "it infrastructure",
        "it operations", "infrastructure operations", "noc",
    ],
    "backend": [
        "backend", "back-end", "api developer", "server-side", "spring boot",
        "django", "flask", "fastapi", "laravel", ".net", "microservices",
    ],
    "frontend": [
        "frontend", "front-end", "react", "angular", "vue", "next.js", "web ui", "ui engineer",
    ],
    "fullstack": [
        "fullstack", "full-stack", "full stack",
    ],
    "mobile": [
        "mobile developer", "android", "ios", "flutter", "react native", "swift", "kotlin",
    ],
    "qa": [
        "qa engineer", "quality assurance", "test engineer", "automation tester", "sdet",
    ],
    "design": [
        "ui/ux", "ux designer", "ui designer", "product designer", "graphic designer",
    ],
    "management": [
        "project manager", "product manager", "engineering manager", "tech lead", "team lead",
        "head of engineering", "cto",
    ],
}


@dataclass
class ClassificationResult:
    category: str
    confidence: str


def _norm(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").lower()).strip()


def _contains_keyword(haystack: str, keyword: str) -> bool:
    """Boundary-aware keyword matching to avoid substring false positives (e.g. soc in associate)."""
    kw = _norm(keyword)
    if not kw:
        return False
    pattern = r"\b" + re.escape(kw).replace(r"\ ", r"\s+") + r"\b"
    return re.search(pattern, haystack) is not None


def classify_job(doc: dict) -> ClassificationResult:
    title = _norm(doc.get("title", ""))
    desc = _norm(doc.get("description_text", ""))
    listed = " ".join(_norm(s) for s in doc.get("listed_skills", []) if s)
    normalized = " ".join(_norm(s) for s in doc.get("normalized_skills", []) if s)
    haystack = " ".join([title, desc, listed, normalized]).strip()

    if not haystack:
        return ClassificationResult(category="other", confidence="low")

    for category in CATEGORY_PRIORITY:
        for kw in KEYWORDS[category]:
            if _contains_keyword(haystack, kw):
                return ClassificationResult(category=category, confidence="high")

    return ClassificationResult(category="other", confidence="low")


def run_cleaning(uri: str, db_name: str, batch_size: int, apply: bool) -> dict:
    client = MongoClient(uri)
    db = client[db_name]
    jobs = db.jobs

    before_counts = Counter()
    after_counts = Counter()
    unchanged = 0
    changed_to_other = 0
    changed_to_specific = 0
    total = 0
    corrected_examples = []

    operations = []
    cursor = jobs.find({}, {"title": 1, "description_text": 1, "listed_skills": 1, "normalized_skills": 1, "category": 1})
    for doc in cursor:
        total += 1
        old_category = (doc.get("category") or "other").lower()
        before_counts[old_category] += 1

        result = classify_job(doc)
        new_category = result.category
        after_counts[new_category] += 1

        if new_category == old_category:
            unchanged += 1
            continue

        if new_category == "other":
            changed_to_other += 1
        else:
            changed_to_specific += 1

        if len(corrected_examples) < 20:
            corrected_examples.append({
                "title": doc.get("title", ""),
                "old_category": old_category,
                "new_category": new_category,
            })

        if apply:
            operations.append(
                UpdateOne({"_id": doc["_id"]}, {"$set": {"category": new_category}})
            )
            if len(operations) >= batch_size:
                jobs.bulk_write(operations, ordered=False)
                operations = []

    if apply and operations:
        jobs.bulk_write(operations, ordered=False)

    return {
        "total_jobs_processed": total,
        "unchanged": unchanged,
        "recategorized_to_other": changed_to_other,
        "recategorized_to_specific_cs": changed_to_specific,
        "before_category_counts": dict(before_counts),
        "after_category_counts": dict(after_counts),
        "sample_corrected_records": corrected_examples,
        "applied": apply,
    }


def main():
    parser = argparse.ArgumentParser(description="Recategorize jobs with medium-strict CS/IT rules.")
    parser.add_argument("--mongodb-uri", default="mongodb://localhost:27017")
    parser.add_argument("--db-name", default="job_board_intelligence")
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--apply", action="store_true", help="Persist category updates to DB.")
    args = parser.parse_args()

    report = run_cleaning(
        uri=args.mongodb_uri,
        db_name=args.db_name,
        batch_size=args.batch_size,
        apply=args.apply,
    )
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

