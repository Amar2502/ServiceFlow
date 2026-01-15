import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

from app.ml import state


def train_departments(departments, save_model: bool = True):
    """
    Train the department classification model
    
    Args:
        departments: List of department objects
        save_model: Whether to persist the model to disk
    
    Returns:
        Dictionary with training results
    """
    if not departments:
        raise ValueError("No departments provided")
    
    data = []
    for d in departments:
        data.append({
            "id": d.id,
            "name": d.name,
            "text": d.keyword.lower().replace(",", " ")
        })

    df = pd.DataFrame(data)

    tfidf = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2)
    )

    dept_vectors = tfidf.fit_transform(df["text"]).toarray()

    # Update state in thread-safe manner
    with state._lock:
        state.tfidf_vectorizer = tfidf
        state.dept_vectors = dept_vectors
        # Create index-to-department-ID mapping (department vectors should be saved to database)
        state.dept_index_to_id = [d.id for d in departments]
    
    # Save model to disk if requested
    version = None
    if save_model:
        version = state.save_model()

    return {
        "status": "success",
        "departments_loaded": len(df),
        "vector_dimension": dept_vectors.shape[1],
        "model_version": version,
        "vectors": {
            d.name: dept_vectors[i].tolist() for i, d in enumerate(departments) 
        }
    }
   