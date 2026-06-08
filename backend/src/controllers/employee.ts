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
        const result = await client.query(
            `SELECT e.id, e.tenant_id, e.user_id, e.department_id, e.load,
              COALESCE(NULLIF(TRIM(e.name), ''), u.name) AS name,
              e.title, e.keywords, e.vector, e.created_at, e.deleted_at
             FROM employees e
             INNER JOIN users u ON u.id = e.user_id
             WHERE e.tenant_id = $1 AND e.deleted_at IS NULL`,
            [tenantId]
        );

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
        const result = await client.query(
            `SELECT e.id, e.tenant_id, e.user_id, e.department_id, e.load,
              COALESCE(NULLIF(TRIM(e.name), ''), u.name) AS name,
              e.title, e.keywords, e.vector, e.created_at, e.deleted_at
             FROM employees e
             INNER JOIN users u ON u.id = e.user_id
             WHERE e.tenant_id = $1 AND e.deleted_at IS NOT NULL`,
            [tenantId]
        );
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

    const { keywords, employeeId } = req.body as { keywords: string, employeeId: string };

    if (!employeeId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    if (!keywords) {
        res.status(400).json({ message: "At least one keyword is required" });
        return;
    }

    // ✅ Clean keywords string and convert to array
    const keywordArray = keywords
        .replace(/[^\w\s]/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    console.log("Processed keywords:", keywordArray);

    const client = await pool.connect();

    try {

        const response = await fetch(`${config.ML_SERVICE_URL}/profile/vectorize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                profile_keywords: keywordArray
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
            let errorMessage = "Department vectorization failed, Try again later";

            if (Array.isArray(errorData)) {
                errorMessage = errorData
                    .map(
                        (err: any) =>
                            `${err.loc?.join(".")}: ${err.msg} (input: ${JSON.stringify(err.input)})`
                    )
                    .join("; ");
            } else if (errorData.detail) {
                errorMessage = errorData.detail;
            } else if (errorData.message) {
                errorMessage = errorData.message;
            }

            console.error("Classifier error:", JSON.stringify(errorData, null, 2), "Status:", response.status);
            throw new Error(`Employee vectorization failed, Try again later: ${errorMessage}`);
        }

        const vectorData = await response.json();
        const vector = vectorData.vectors;

        if (!vector) {
            throw new Error("Vector not returned by ML service");
        }


        // 3 update employee
        const employeeResult = await client.query(
            "UPDATE employees SET vector = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id", 
            [JSON.stringify(vector), employeeId, tenantId]
        );

        res.status(200).json({
            message: "Employee vector updated successfully",
            employee: {
                id: employeeResult.rows[0].id,
            name: employeeResult.rows[0].name,
            keywords: keywordArray,
            },
            vector_dimension: vectorData.vector_dimension,
        });

    }
    catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}

export const updateEmployeeName = async (req: Request, res: Response) => {

    const { employeeId, name } = req.body as { tenantId: string, employeeId: string, name: string };

    if (!employeeId || !name) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {
        const result = await client.query("UPDATE employees SET name = $1 WHERE id = $2 RETURNING id, name, user_id", [name, employeeId]);

        await client.query("UPDATE users SET name = $1 WHERE id = $2", [name, result.rows[0].user_id]);

        res.status(200).json({
            id: result.rows[0].id,
            name: result.rows[0].name,
            message: "Employee name updated successfully"
        });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}

export const getMyAssignments = async (req: Request, res: Response) => {

    const { employeeId } = req.params as { employeeId: string };

    if (!employeeId) {
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

        const result = await client.query(`SELECT
            a.id,
            a.complaint_id,
            a.assignee_type,
            a.assigned_at,
            c.title,
            c.description,
            c.customer_name,
            c.customer_email,
            c.status,
            c.external_reference_id,
            c.created_at,
            c.updated_at
            FROM assignments a
            LEFT JOIN complaints c
            ON a.complaint_id = c.id
            WHERE a.employee_id = $1 AND c.deleted_at IS NULL
            ORDER BY a.assigned_at DESC
            `, [employeeId]);

        res.status(200).json(result.rows);

    }
    catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}