import dotenv from "dotenv";

dotenv.config();

export const config = {
    
    PORT : Number(process.env.PORT) || 5000,
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_PORT: Number(process.env.DB_PORT) || 5432,
    DB_USER: process.env.DB_USER || "postgres",
    DB_PASSWORD: process.env.DB_PASSWORD || "amar2502",
    DB_NAME: process.env.DB_NAME || "serviceflow",
    JWT_SECRET: process.env.JWT_SECRET || "secret",
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
    ML_SERVICE_URL: process.env.ML_SERVICE_URL || "http://localhost:8000",
}