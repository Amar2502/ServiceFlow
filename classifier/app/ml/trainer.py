import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

from app.ml import state


def fit_tfidf_on_profiles(profile_keywords, save_model: bool = True):
    """
    Train the department classification model
    
    Args:
        profile_keywords: List of profile keywords
        save_model: Whether to persist the model to disk
    
    Returns:
        Dictionary with training results
    """
    if not profile_keywords:
        raise ValueError("No profile keywords provided")
    
    data = []
    for keyword in profile_keywords:
        data.append({
            "text": keyword
        })

    df = pd.DataFrame(data)

    tfidf = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2)
    )

    vectors = tfidf.fit_transform(df["text"]).toarray()

    with state._lock:
        state.tfidf_vectorizer = tfidf
        state.dept_vectors = vectors


    version = None
    if save_model:
        version = state.save_model()

    return {
        "status": "success",
        "vector_dimension": int(vectors.shape[1]),
        "vectors": vectors.tolist(),
    }
