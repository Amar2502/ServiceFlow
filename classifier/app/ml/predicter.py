import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from app.ml.preprocess import preprocess_text
from app.ml import state
from typing import Dict

from app.schemas import ProfileVector


def _pad_truncate_1d(row: np.ndarray, n_features: int) -> np.ndarray:
    if row.ndim != 1:
        row = row.ravel()
    if row.size < n_features:
        return np.pad(row, (0, n_features - row.size))
    if row.size > n_features:
        return row[:n_features].copy()
    return row


def _profile_vector_to_1d(vec: ProfileVector, n_features: int) -> np.ndarray:
    """
    Turn stored JSON (1D or 2D, possibly ragged rows from mixed model versions) into
    one dense row of length n_features for cosine similarity with the live vectorizer.
    """
    if vec is None:
        raise ValueError("Profile vector is missing")

    # Raw Python lists: avoid np.asarray on ragged 2D (raises or dtype=object)
    if isinstance(vec, (list, tuple)):
        if len(vec) == 0:
            raise ValueError("Profile vector is empty")
        first = vec[0]
        if isinstance(first, (list, tuple)):
            rows = [_pad_truncate_1d(np.asarray(r, dtype=np.float64), n_features) for r in vec]
            return np.mean(np.vstack(rows), axis=0)
        one = _pad_truncate_1d(np.asarray(vec, dtype=np.float64), n_features)
        return one

    arr = np.asarray(vec, dtype=np.float64)
    if arr.ndim == 1:
        if arr.size == 0:
            raise ValueError("Profile vector is empty")
        return _pad_truncate_1d(arr, n_features)
    if arr.ndim == 2:
        if arr.size == 0:
            raise ValueError("Profile vector matrix is empty")
        rows = [_pad_truncate_1d(arr[i], n_features) for i in range(arr.shape[0])]
        return np.mean(np.vstack(rows), axis=0)
    raise ValueError("Each profile vector must be 1D or 2D (rows = keywords)")


def predict_profiles(complaint: str, vectors: Dict[str, ProfileVector], threshold: float):
    """
    Predict profiles for a complaint using provided profiles vectors
    
    Args:
        complaint: The complaint text
        vectors: Dictionary mapping profile names to their vectors
        threshold: Confidence threshold for auto-assignment
    
    Returns:
        Dictionary with prediction results
    """
    if not complaint or not complaint.strip():
        raise ValueError("Complaint text cannot be empty")
    
    if not vectors:
        raise ValueError("Profiles vectors cannot be empty")
    
    if state.tfidf_vectorizer is None:
        raise ValueError("Model not initialized. TF-IDF vectorizer not loaded.")
    
    complaint_text = preprocess_text(complaint)
    profile_ids = list(vectors.keys())

    with state._lock:
        complaint_vector = state.tfidf_vectorizer.transform(
            [complaint_text]
        ).toarray()
        n_features = int(complaint_vector.shape[1])

        profile_rows = []
        for pid in profile_ids:
            try:
                profile_rows.append(_profile_vector_to_1d(vectors[pid], n_features))
            except Exception as ex:
                raise ValueError(f"Profile '{pid}': {ex}") from ex

        profile_vectors_array = np.vstack(profile_rows)
        scores = cosine_similarity(complaint_vector, profile_vectors_array)[0]

        idx = scores.argmax()
        confidence = float(scores[idx])
        profile_id = profile_ids[idx]

    return {
        "profile_id": profile_id,
        "confidence": round(confidence, 3),
        "needs_review": confidence == 0,
        "model_version": state.model_version
    }
