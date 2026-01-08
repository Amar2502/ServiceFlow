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

export const updateComplaintStatus = async (req: Request, res: Response) => {

    const { complaintId, status } = req.body as { complaintId: string, status: string };

    console.log(complaintId, status);

    if (!complaintId || !status) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {

        const result = await client.query("UPDATE complaints SET status = $1 WHERE id = $2 RETURNING id, status", [status, complaintId]);

        console.log(result.rows);

        res.status(200).json({ 
            id: result.rows[0].id,
            status: result.rows[0].status,
            message: "Complaint status updated successfully" 
        });

    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const deleteComplaint = async (req: Request, res: Response) => {

    const { complaintId } = req.body as { tenantId: string, complaintId: string };

    if (!complaintId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query("UPDATE complaints SET deleted_at = NOW() WHERE id = $1", [complaintId]);
        res.status(200).json({ message: "Complaint deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const restoreComplaint = async (req: Request, res: Response) => {
    
    const { complaintId } = req.body as { tenantId: string, complaintId: string };
    
    if (!complaintId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query("UPDATE complaints SET deleted_at = NULL WHERE id = $1", [complaintId]);
        res.status(200).json({ message: "Complaint restored successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const assignComplaintToAssigneeThroughML = async (req: Request, res: Response) => {
    
    const { tenantId, complaintId, assigneeType, assigneeId } = req.body as { tenantId: string, complaintId: string, assigneeType: string, assigneeId: string };
    
    if (!tenantId || !complaintId || !assigneeType || !assigneeId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query("INSERT INTO assignments (tenant_id, complaint_id, assignee_type, assignee_id) VALUES ($1, $2, $3, $4)", [tenantId, complaintId, assigneeType, assigneeId]);
        res.status(200).json({ message: "Complaint assigned to " + assigneeType + " successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const assignComplaintToEmployee = async (req: Request, res: Response) => {
    
    const { complaintId, employeeId } = req.body as { complaintId: string, employeeId: string };

    if (!complaintId || !employeeId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const tenantId = req.user?.tenantId;

    const client = await pool.connect();

    try {
        await client.query("INSERT INTO assignments (tenant_id, complaint_id, assignee_type, assignee_id) VALUES ($1, $2, $3, $4)", [tenantId, complaintId, "EMPLOYEE", employeeId]);
        res.status(200).json({ 
            id: complaintId,
            assignedTo: employeeId,
            message: "Complaint assigned to employee successfully" 
        });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
    
}