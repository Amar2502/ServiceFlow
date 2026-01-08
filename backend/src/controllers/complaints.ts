import { Request, Response } from "express";
import pool from "../config/db";

interface CreateComplaintBody {
    title: string;
    description?: string;
    customerName: string;
    customerEmail: string;
    externalReferenceId?: string;
}

export const createComplaint = async (req: Request, res: Response) => {

    const { title, description, customerName, customerEmail, externalReferenceId } = req.body as CreateComplaintBody;

    const client = await pool.connect();

    const tenantId = req.user?.tenantId;

    console.log(tenantId);

    if (!title || !customerName || !customerEmail) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    try {

        await client.query("INSERT INTO complaints (title, description, customer_name, customer_email, external_reference_id, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)", [title, description, customerName, customerEmail, externalReferenceId, tenantId]);

        console.log("done from controller");

        res.status(201).json({ message: "Complaint created successfully" });

    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const getAllComplaints = async (req: Request, res: Response) => {

    const tenantId = req.user?.tenantId;

    const client = await pool.connect();

    try {
        const result = await client.query("SELECT * FROM complaints WHERE tenant_id = $1", [tenantId]);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}