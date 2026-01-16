import { Request, Response } from "express";
import pool from "../config/db";
import { config } from "../config/config";

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
    
    const { complaintId, complaintText } = req.body as { complaintId: string, complaintText: string };
    
    if (!complaintText) {
        res.status(400).json({ message: "Complaint text is required" });
        return;
    }

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    const client = await pool.connect();

    try {
        // Get tenant routing mode
        const routingModeResult = await client.query(
            "SELECT routing_mode FROM tenants WHERE id = $1",
            [tenantId]
        );

        if (routingModeResult.rows.length === 0) {
            res.status(404).json({ message: "Tenant not found" });
            return;
        }

        const routingMode = routingModeResult.rows[0].routing_mode;

        if (routingMode === "DEPARTMENT") {
            // Get all department vectors from database
            const deptResult = await client.query(
                "SELECT id, name, vector FROM departments WHERE tenant_id = $1 AND deleted_at IS NULL AND vector IS NOT NULL",
                [tenantId]
            );

            if (deptResult.rows.length === 0) {
                res.status(400).json({ 
                    message: "No department vectors found. Please create department vectors first." 
                });
                return;
            }

            // Build vectors dictionary: department name -> vector array
            const vectors: { [key: string]: number[] } = {};
            const deptIdToName: { [key: string]: string } = {};

            for (const dept of deptResult.rows) {
                if (dept.vector) {
                    vectors[dept.name] = dept.vector;
                    deptIdToName[dept.id] = dept.name;
                }
            }

            // Call classifier service for prediction
            const response = await fetch(`${config.ML_SERVICE_URL}/departments/predict`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    complaint: complaintText,
                    vectors: vectors,
                    confidence_threshold: 0.8
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
                res.status(response.status).json({ message: errorData.detail || "Prediction failed" });
                return;
            }

            const prediction = await response.json();
            
            // Find department ID from name
            const assignedDept = deptResult.rows.find(d => d.name === prediction.department);
            
            if (!assignedDept) {
                res.status(500).json({ message: "Predicted department not found" });
                return;
            }

            // Create assignment if complaintId is provided
            if (complaintId) {
                await client.query(
                    "INSERT INTO assignments (tenant_id, complaint_id, assignee_type, assignee_id) VALUES ($1, $2, $3, $4)",
                    [tenantId, complaintId, "DEPARTMENT", assignedDept.id]
                );
            }

            res.status(200).json({
                message: "Complaint assigned successfully",
                assignment: {
                    assignee_type: "DEPARTMENT",
                    assignee_id: assignedDept.id,
                    department_name: prediction.department,
                    confidence: prediction.confidence,
                    needs_review: prediction.needs_review
                }
            });

        } else if (routingMode === "EMPLOYEE") {
            // Get all employee vectors from database
            const empResult = await client.query(
                `SELECT e.id, e.title, e.vector, u.email 
                 FROM employees e 
                 JOIN users u ON e.user_id = u.id 
                 WHERE e.tenant_id = $1 AND e.deleted_at IS NULL AND e.vector IS NOT NULL`,
                [tenantId]
            );

            if (empResult.rows.length === 0) {
                res.status(400).json({ 
                    message: "No employee vectors found. Please create employee vectors first." 
                });
                return;
            }

            // Build vectors dictionary: employee email -> vector array
            const vectors: { [key: string]: number[] } = {};
            const empIdToEmail: { [key: string]: string } = {};

            for (const emp of empResult.rows) {
                if (emp.vector) {
                    const identifier = emp.email || `employee_${emp.id}`;
                    vectors[identifier] = emp.vector;
                    empIdToEmail[emp.id] = identifier;
                }
            }

            // Call classifier service for prediction (using same endpoint as departments)
            const response = await fetch(`${config.ML_SERVICE_URL}/departments/predict`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    complaint: complaintText,
                    vectors: vectors,
                    confidence_threshold: 0.8
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
                res.status(response.status).json({ message: errorData.detail || "Prediction failed" });
                return;
            }

            const prediction = await response.json();
            
            // Find employee ID from email/identifier
            const assignedEmp = empResult.rows.find(e => {
                const identifier = e.email || `employee_${e.id}`;
                return identifier === prediction.department;
            });
            
            if (!assignedEmp) {
                res.status(500).json({ message: "Predicted employee not found" });
                return;
            }

            // Create assignment if complaintId is provided
            if (complaintId) {
                await client.query(
                    "INSERT INTO assignments (tenant_id, complaint_id, assignee_type, assignee_id) VALUES ($1, $2, $3, $4)",
                    [tenantId, complaintId, "EMPLOYEE", assignedEmp.id]
                );
            }

            res.status(200).json({
                message: "Complaint assigned successfully",
                assignment: {
                    assignee_type: "EMPLOYEE",
                    assignee_id: assignedEmp.id,
                    employee_email: assignedEmp.email,
                    employee_title: assignedEmp.title,
                    confidence: prediction.confidence,
                    needs_review: prediction.needs_review
                }
            });

        } else {
            res.status(400).json({ message: "Invalid routing mode" });
        }

    } catch (err) {
        console.error("Error assigning complaint:", err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}