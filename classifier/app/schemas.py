from pydantic import BaseModel
from typing import List, Dict


class DepartmentInput(BaseModel):
    id: int
    name: str
    keyword: List[str]


class VectorizeRequest(BaseModel):
    departments: List[DepartmentInput]


class PredictRequest(BaseModel):
    complaint: str
    vectors: Dict[str, List[float]]  # Department name -> vector mapping
    confidence_threshold: float = 0.8
