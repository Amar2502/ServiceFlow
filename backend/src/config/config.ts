import dotenv from "dotenv";

dotenv.config();

export const config = {
    
    PORT : Number(process.env.PORT) || 5000,
    DATABASE_URL: process.env.DATABASE_URL || "",
    JWT_SECRET: process.env.JWT_SECRET || "secret",
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
    ML_SERVICE_URL: process.env.ML_SERVICE_URL || "http://localhost:8000",
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
}