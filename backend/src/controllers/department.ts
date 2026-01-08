import { Request, Response } from "express";
import pool from "../config/db";

export const createDepartment = async (req: Request, res: Response) => {
    
    const { name } = req.body as { name: string };

    const tenantId = req.user?.tenantId;
    
    if (!name) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {
        const result = await client.query("INSERT INTO departments (name, tenant_id) VALUES ($1, $2) RETURNING id, name", [name, tenantId]);

        res.status(201).json({
            id: result.rows[0].id,
            name: result.rows[0].name,
            message: "Department created successfully"
        });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
    
}

export const getAllDepartments = async (req: Request, res: Response) => {


    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    const client = await pool.connect();

    try {
        const result = await client.query("SELECT * FROM departments WHERE tenant_id = $1 AND deleted_at IS NULL", [tenantId]);
        res.status(200).json(result.rows);
    } catch (err) { 
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const getAllDeletedDepartments = async (req: Request, res: Response) => {

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    const client = await pool.connect();

    try {
        const result = await client.query("SELECT * FROM departments WHERE tenant_id = $1 AND deleted_at IS NOT NULL", [tenantId]);
        res.status(200).json(result.rows);
    } catch (err) { 
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const deleteDepartment = async (req: Request, res: Response) => {
    
    const { departmentId } = req.body as { tenantId: string, departmentId: string };
    
    if (!departmentId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query("UPDATE departments SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2", [departmentId, tenantId]);
        res.status(200).json({ message: "Department deleted successfully" });
    } catch (err) { 
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const restoreDepartment = async (req: Request, res: Response) => {
    
    const { departmentId } = req.body as { departmentId: string };

    const tenantId = req.user?.tenantId;

    if (!departmentId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query("UPDATE departments SET deleted_at = NULL WHERE id = $1 AND tenant_id = $2", [departmentId, tenantId]);
        res.status(200).json({ message: "Department restored successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
    
}