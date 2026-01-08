import { Request, Response } from "express";
import pool from "../config/db";

export const getAllEmployees = async (req: Request, res: Response) => {

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    const client = await pool.connect();

    try {
        const result = await client.query("SELECT * FROM employees WHERE tenant_id = $1", [tenantId]);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}