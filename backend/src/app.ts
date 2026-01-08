import express from "express";
import authRouter from "./routes/authroute";
import cookieParser from "cookie-parser";
import cors from "cors";
import apiKeyRouter from "./routes/apiroute";
import { authmiddleware } from "./middlewares/auth";
import { apiKeyAuth } from "./middlewares/apikeymiddleware";
import complaintroute from "./routes/create-complaintroute";
import inviteRouter from "./routes/inviteroute";
import employeeRouter from "./routes/employeeroutes";
import { adminmiddleware } from "./middlewares/adminmiddleware";
import complaintRouter from "./routes/complaint";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors());

app.use("/api/auth", authRouter);
app.use("/api/apikey",authmiddleware, apiKeyRouter);
app.use("/api/create-complaint", apiKeyAuth, complaintroute);
app.use("/api/invite",authmiddleware, inviteRouter);
app.use("/api/employees",adminmiddleware, employeeRouter);
app.use("/api/complaints", adminmiddleware, complaintRouter);

export default app;