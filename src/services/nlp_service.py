"""
Natural Language Processing Service
Implements Tokenization, Sentiment Analysis, and Entity Recognition.
"""

import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from textblob import TextBlob
import spacy
from typing import List, Dict, Any, Optional
import ollama
from src.utils.config import get_settings

# Download necessary NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')


class NLPService:
    """
    NLP capabilities for job market analysis.
    """

    @staticmethod
    def tokenize_and_clean(text: str) -> List[str]:
        """
        Tokenization and Stop Word Removal.
        """
        tokens = word_tokenize(text)
        stop_words = set(stopwords.words('english'))
        filtered = [w for w in tokens if w.isalnum() and w.lower() not in stop_words]
        return filtered

    @staticmethod
    def analyze_sentiment(text: str) -> Dict:
        """
        Sentiment Analysis using TextBlob.
        """
        analysis = TextBlob(text)
        polarity = analysis.sentiment.polarity
        
        sentiment = "Neutral"
        if polarity > 0.1:
            sentiment = "Positive"
        elif polarity < -0.1:
            sentiment = "Negative"
            
        return {
            "score": round(polarity, 4),
            "sentiment": sentiment
        }

    @staticmethod
    def extract_entities(text: str) -> List[Dict]:
        """
        Named Entity Recognition (NER) using spaCy.
        """
        try:
            nlp = spacy.load("en_core_web_sm")
        except OSError:
            # Fallback if model not installed
            return [{"error": "spaCy model 'en_core_web_sm' not found"}]
            
        doc = nlp(text)
        entities = []
        for ent in doc.ents:
            entities.append({
                "text": ent.text,
                "label": ent.label_
            })
        return entities

    @staticmethod
    async def generate_career_advice(job_title: str, skills: List[str]) -> str:
        """
        Generates career advice using the local LLM.
        """
        prompt = f"I am looking for a job as a {job_title}. I have the following skills: {', '.join(skills)}. Can you give me 3 career advice points?"
        
        settings = get_settings()
        try:
            response = ollama.generate(
                model=settings.ollama_model, 
                prompt=prompt
            )
            return response['response']
        except Exception as e:
            return f"Ollama error: {str(e)}. Please ensure Ollama is running locally."

    @staticmethod
    async def extract_structured_job_info(text: str) -> Dict:
        """
        Extracts structured job information from text using LLM.
        """
        prompt = f"""
        Extract the following information from this job description and return it as JSON:
        '{text}'
        Fields: job_title, company, required_skills (list), experience_level, location.
        """
        
        settings = get_settings()
        try:
            response = ollama.generate(
                model=settings.ollama_model, 
                prompt=prompt, 
                format='json'
            )
            import json
            return json.loads(response['response'])
        except Exception as e:
            return {"error": f"Ollama error: {str(e)}"}
