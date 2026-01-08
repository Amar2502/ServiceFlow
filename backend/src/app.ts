import express from "express";
import authRouter from "./routes/authroute";
import cookieParser from "cookie-parser";
import cors from "cors";
import apiKeyRouter from "./routes/apiroute";
import inviteRouter from "./routes/inviteroute";
import employeeRouter from "./routes/employeeroutes";
import complaintRouter from "./routes/complaintroute";
import tenantRouter from "./routes/tenantroute";
import departmentRouter from "./routes/departmentroute";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors());

app.use("/api/auth", authRouter);
app.use("/api/apikey", apiKeyRouter);
app.use("/api/invite", inviteRouter);
app.use("/api/employees", employeeRouter);
app.use("/api/complaints", complaintRouter);
app.use("/api/tenant", tenantRouter);
app.use("/api/departments", departmentRouter);

export default app;