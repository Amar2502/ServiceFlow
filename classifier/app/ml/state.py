import threading
from pathlib import Path
from typing import Optional
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

# Thread-safe state management
_lock = threading.Lock()

# Model storage directory
MODEL_DIR = Path("models")
MODEL_DIR.mkdir(exist_ok=True)

# Current model state
tfidf_vectorizer: Optional[TfidfVectorizer] = None
dept_vectors: Optional[np.ndarray] = None  # Department vectors (stored in DB, kept in memory for predictions)
dept_index_to_id: Optional[list] = None  # Maps vector index to department ID
model_version: Optional[str] = None


def save_model(version: str = None):
    """Save current model state to disk"""
    with _lock:
        if tfidf_vectorizer is None:
            raise ValueError("Model not initialized")
        
        if version is None:
            import datetime
            version = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        
        model_path = MODEL_DIR / f"model_{version}"
        model_path.mkdir(exist_ok=True)
        
        # Save components (only TF-IDF vectorizer, department vectors stored in DB)
        joblib.dump(tfidf_vectorizer, model_path / "tfidf_vectorizer.joblib")
        
        # Save metadata
        with open(model_path / "version.txt", "w") as f:
            f.write(version)
        
        global model_version
        model_version = version
        
        return version


def load_model(version: str = None):
    """Load model from disk"""
    global tfidf_vectorizer, model_version
    
    with _lock:
        if version is None:
            # Load latest model
            versions = [d.name for d in MODEL_DIR.iterdir() if d.is_dir() and d.name.startswith("model_")]
            if not versions:
                return False
            # Get the directory name (already includes "model_" prefix)
            model_dir_name = sorted(versions)[-1]
            model_path = MODEL_DIR / model_dir_name
            # Extract version from directory name (remove "model_" prefix)
            version = model_dir_name.replace("model_", "", 1)
        else:
            # If version is provided, construct the path
            model_path = MODEL_DIR / f"model_{version}"
        
        if not model_path.exists():
            return False
        
        try:
            tfidf_vectorizer = joblib.load(model_path / "tfidf_vectorizer.joblib")
            # Note: Department vectors should be loaded from database
            model_version = version
            return True
        except Exception as e:
            raise ValueError(f"Failed to load model: {str(e)}")


def get_model_info():
    """Get current model information"""
    with _lock:
        return {
            "loaded": tfidf_vectorizer is not None,
            "version": model_version,
            "vector_dimension": dept_vectors.shape[1] if dept_vectors is not None else None
        }
