from pydantic import BaseModel, Field
from typing import List, Dict


class DepartmentInput(BaseModel):
    id: str = Field(..., description="Department UUID identifier")
    name: str
    keyword: List[str]


class VectorizeRequest(BaseModel):
    departments: List[DepartmentInput]


class PredictRequest(BaseModel):
    complaint: str
    vectors: Dict[str, List[float]]  # Department name -> vector mapping
    confidence_threshold: float = 0.8
