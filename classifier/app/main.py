from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from app.schemas import VectorizeRequest, PredictRequest
from app.ml.trainer import train_departments
from app.ml.predicter import predict_department
from app.ml import state
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Department Classification API",
    description="ML-powered department classification service",
    version="1.0.0"
)


@app.on_event("startup")
async def startup_event():
    """Load model on startup if available"""
    logger.info("Starting up...")
    try:
        if state.load_model():
            logger.info(f"Model loaded successfully. Version: {state.model_version}")
        else:
            logger.warning("No saved model found. Model will need to be trained.")
    except Exception as e:
        logger.error(f"Failed to load model on startup: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    model_info = state.get_model_info()
    return {
        "status": "healthy",
        "model": model_info
    }


@app.post("/departments/vectorize")
async def vectorize_departments(payload: VectorizeRequest):
    """Train/retrain the department classification model"""
    try:
        result = train_departments(payload.departments, save_model=True)
        logger.info(f"Model trained successfully. Version: {result.get('model_version')}")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Training failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@app.post("/departments/predict")
async def predict(payload: PredictRequest):
    """Predict department for a complaint using provided department vectors"""
    try:
        if state.tfidf_vectorizer is None:
            raise HTTPException(
                status_code=400,
                detail="Model not initialized. Call /departments/vectorize first."
            )
        
        return predict_department(
            payload.complaint,
            payload.vectors,
            payload.confidence_threshold
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/model/info")
async def get_model_info():
    """Get current model information"""
    return state.get_model_info()


@app.post("/model/load")
async def load_model(version: str = None):
    """Load a specific model version"""
    try:
        if state.load_model(version):
            return {
                "status": "success",
                "version": state.model_version,
                "message": f"Model version {state.model_version} loaded successfully"
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Model version '{version}' not found"
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
