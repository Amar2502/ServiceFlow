from pydantic import BaseModel
from typing import List, Dict, Union

# One row per keyword from /profile/vectorize, or a single aggregated row
Vector1D = List[float]
Vector2D = List[Vector1D]
ProfileVector = Union[Vector1D, Vector2D]


class VectorizeRequest(BaseModel):
    profile_keywords: List[str]


class PredictRequest(BaseModel):
    complaint: str
    vectors: Dict[str, ProfileVector]
    confidence_threshold: float = 0.6
