import express from "express";
import authRouter from "./routes/authroute";
import cookieParser from "cookie-parser";
import cors from "cors";
import apiKeyRouter from "./routes/apiroute";
import { authmiddleware } from "./middlewares/auth";
import { apiKeyAuth } from "./middlewares/apikeymiddleware";
import complaintroute from "./routes/complaintroute";
import inviteRouter from "./routes/inviteroute";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors());

app.use("/api/auth", authRouter);
app.use("/api/apikey",authmiddleware, apiKeyRouter);
app.use("/api/complaints", apiKeyAuth, complaintroute);
app.use("/api/invite",authmiddleware, inviteRouter);

export default app;