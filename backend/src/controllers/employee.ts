import { Request, Response } from "express";
import pool from "../config/db";
import { config } from "../config/config";

export const getAllActiveEmployees = async (req: Request, res: Response) => {

    console.log("All Active Employees");

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    console.log(tenantId);

    const client = await pool.connect();

    try {
        const result = await client.query("SELECT * FROM employees WHERE tenant_id = $1 AND deleted_at IS NULL", [tenantId]);
        
        console.log(result.rows);

        res.status(200).json(result.rows);
    } catch (err) {
        return res.status(500).json({ message: "Internal server error" });
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

export const createEmployeeVectors = async (req: Request, res: Response) => {

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    const client = await pool.connect();

    try {
        // Fetch all active employees for the tenant with their titles and keywords
        const employeesResult = await client.query(
            `SELECT e.id, e.title, e.keywords, u.email 
             FROM employees e 
             JOIN users u ON e.user_id = u.id 
             WHERE e.tenant_id = $1 AND e.deleted_at IS NULL`,
            [tenantId]
        );

        if (employeesResult.rows.length === 0) {
            res.status(400).json({ message: "No employees found. Please create employees first." });
            return;
        }

        // Prepare data for classifier (using same approach as departments)
        // Combine title and keywords for vectorization
        const employees = employeesResult.rows.map((emp, index) => ({
            id: index + 1, // Classifier expects numeric IDs
            name: emp.email || `employee_${emp.id}`, // Use email as identifier
            keyword: `${emp.title || ""} ${emp.keywords || ""}`.trim() || emp.email
        }));

        // Call classifier service to vectorize employees (using department endpoint as it uses same logic)
        const response = await fetch(`${config.ML_SERVICE_URL}/departments/vectorize`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ departments: employees })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
            res.status(response.status).json({ message: errorData.detail || "Failed to vectorize employees" });
            return;
        }

        const vectorData = await response.json();

        // Update each employee with its vector
        const vectors = vectorData.vectors || {};
        let updatedCount = 0;

        for (const emp of employeesResult.rows) {
            const employeeName = emp.email || `employee_${emp.id}`;
            const vector = vectors[employeeName];
            if (vector) {
                await client.query(
                    "UPDATE employees SET vector = $1 WHERE id = $2 AND tenant_id = $3",
                    [JSON.stringify(vector), emp.id, tenantId]
                );
                updatedCount++;
            }
        }

        res.status(200).json({
            message: "Employee vectors created successfully",
            employees_updated: updatedCount,
            model_version: vectorData.model_version,
            vector_dimension: vectorData.vector_dimension
        });

    } catch (err) {
        console.error("Error creating employee vectors:", err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}