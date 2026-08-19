import dotenv from "dotenv";

dotenv.config();

export const config = {
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "secret",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || "http://localhost:8000",
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY || "",
  IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY || "",
  IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT || "",
};