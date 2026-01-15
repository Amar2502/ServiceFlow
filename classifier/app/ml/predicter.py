import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from app.ml.preprocess import preprocess_text
from app.ml import state
from typing import Dict, List


def predict_department(complaint: str, vectors: Dict[str, List[float]], threshold: float):
    """
    Predict department for a complaint using provided department vectors
    
    Args:
        complaint: The complaint text
        vectors: Dictionary mapping department names to their vectors
        threshold: Confidence threshold for auto-assignment
    
    Returns:
        Dictionary with prediction results
    """
    if not complaint or not complaint.strip():
        raise ValueError("Complaint text cannot be empty")
    
    if not vectors:
        raise ValueError("Department vectors cannot be empty")
    
    if state.tfidf_vectorizer is None:
        raise ValueError("Model not initialized. TF-IDF vectorizer not loaded.")
    
    complaint_text = preprocess_text(complaint)

    # Convert vectors dictionary to numpy array
    # Maintain order of departments and track department names
    dept_names = list(vectors.keys())
    dept_vectors_array = np.array([vectors[name] for name in dept_names])

    # Thread-safe access to model state
    with state._lock:
        complaint_vector = state.tfidf_vectorizer.transform(
            [complaint_text]
        ).toarray()

        scores = cosine_similarity(
            complaint_vector,
            dept_vectors_array
        )[0]

        idx = scores.argmax()
        confidence = float(scores[idx])
        department_name = dept_names[idx]

    return {
        "department": department_name,
        "confidence": round(confidence, 3),
        "needs_review": confidence == 0,
        "model_version": state.model_version
    }
