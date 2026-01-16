import { Request, Response } from "express";
import pool from "../config/db";
import { config } from "../config/config";

export const createDepartment = async (req: Request, res: Response) => {
    
    const { name, keywords } = req.body as { name: string, keywords: string };

    const tenantId = req.user?.tenantId;
    
    if (!name || !keywords) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {
        const result = await client.query("INSERT INTO departments (name, keywords, tenant_id) VALUES ($1, $2, $3) RETURNING id, name", [name, keywords, tenantId]);

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

export const createDepartmentVectors = async (req: Request, res: Response) => {

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    const client = await pool.connect();

    try {
        // Fetch all active departments for the tenant
        const departmentsResult = await client.query(
            "SELECT id, name, keywords FROM departments WHERE tenant_id = $1 AND deleted_at IS NULL",
            [tenantId]
        );

        if (departmentsResult.rows.length === 0) {
            res.status(400).json({ message: "No departments found. Please create departments first." });
            return;
        }

        // Prepare data for classifier
        const departments = departmentsResult.rows.map((dept, index) => ({
            id: index + 1, // Classifier expects numeric IDs
            name: dept.name,
            keyword: dept.keywords || ""
        }));

        // Call classifier service to vectorize departments
        const response = await fetch(`${config.ML_SERVICE_URL}/departments/vectorize`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ departments })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
            res.status(response.status).json({ message: errorData.detail || "Failed to vectorize departments" });
            return;
        }

        const vectorData = await response.json();

        // Update each department with its vector
        const vectors = vectorData.vectors || {};
        let updatedCount = 0;

        for (const dept of departmentsResult.rows) {
            const vector = vectors[dept.name];
            if (vector) {
                await client.query(
                    "UPDATE departments SET vector = $1 WHERE id = $2 AND tenant_id = $3",
                    [JSON.stringify(vector), dept.id, tenantId]
                );
                updatedCount++;
            }
        }

        res.status(200).json({
            message: "Department vectors created successfully",
            departments_updated: updatedCount,
            model_version: vectorData.model_version,
            vector_dimension: vectorData.vector_dimension
        });

    } catch (err) {
        console.error("Error creating department vectors:", err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}