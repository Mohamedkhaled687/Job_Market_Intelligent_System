import re
import unicodedata
from bs4 import BeautifulSoup


def strip_html(html: str) -> str:
    if not html:
        return ""
    soup = BeautifulSoup(html, "lxml")
    return soup.get_text(separator=" ", strip=True)


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def clean_description(raw: str) -> str:
    text = strip_html(raw)
    return normalize_text(text)
