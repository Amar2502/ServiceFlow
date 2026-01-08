import { Request, Response } from "express";
import pool from "../config/db";

export const getAllActiveEmployees = async (req: Request, res: Response) => {

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    const client = await pool.connect();

    try {
        const result = await client.query("SELECT * FROM employees WHERE tenant_id = $1 AND deleted_at IS NULL", [tenantId]);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const getAllDeletedEmployees = async (req: Request, res: Response) => {

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    const client = await pool.connect();

    try {
        const result = await client.query("SELECT * FROM employees WHERE tenant_id = $1 AND deleted_at IS NOT NULL", [tenantId]);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const deleteEmployee = async (req: Request, res: Response) => {

    const { employeeId } = req.body as { tenantId: string, employeeId: string };

    const tenantId = req.user?.tenantId;

    if (!employeeId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }
    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query("UPDATE employees SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2", [employeeId, tenantId]);
        res.status(200).json({ message: "Employee deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const restoreEmployee = async (req: Request, res: Response) => {
    
    const { employeeId } = req.body as { tenantId: string, employeeId: string };

    const tenantId = req.user?.tenantId;

    if (!employeeId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query("UPDATE employees SET deleted_at = NULL WHERE id = $1 AND tenant_id = $2", [employeeId, tenantId]);
        res.status(200).json({ message: "Employee restored successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const mapEmployeeToDepartment = async (req: Request, res: Response) => {
    
    const { employeeId, departmentId } = req.body as { tenantId: string, employeeId: string, departmentId: string };
    
    if (!employeeId || !departmentId) {
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
        await client.query("UPDATE employees SET department_id = $1 WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL", [departmentId, employeeId, tenantId]);
        res.status(200).json({ message: "Employee mapped to department successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}