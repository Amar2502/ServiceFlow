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
    const { title, description, customerName, customerEmail, externalReferenceId } =
      req.body as CreateComplaintBody;
  
    const tenantId = req.user?.tenantId;
    const routingMode = req.user?.routingMode;
  
    if (!title || !customerName || !customerEmail) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }
  
    if (!tenantId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  
    if (!routingMode) {
      return res.status(400).json({ message: "Routing mode not configured" });
    }
  
    const complaintText = description ? `${title} ${description}` : title;
  
    const client = await pool.connect();
  
    try {
      await client.query("BEGIN");
  
      // 1️⃣ Create complaint
      const complaintResult = await client.query(
        `INSERT INTO complaints 
         (title, description, customer_name, customer_email, external_reference_id, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [title, description, customerName, customerEmail, externalReferenceId, tenantId]
      );
  
      const complaintId = complaintResult.rows[0].id;
  
      // 2️⃣ Routing
      if (routingMode === "DEPARTMENT") {
        const deptResult = await client.query(
          `SELECT id, name, vector 
           FROM departments 
           WHERE tenant_id = $1 
             AND deleted_at IS NULL 
             AND vector IS NOT NULL`,
          [tenantId]
        );
  
        if (deptResult.rows.length === 0) {
          throw new Error("No department vectors found");
        }
  
        const vectors: Record<string, number[]> = {};
        for (const d of deptResult.rows) {
          vectors[d.name] = d.vector;
        }
  
        const response = await fetch(`${config.ML_SERVICE_URL}/departments/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            complaint: complaintText,
            vectors,
            confidence_threshold: 0.8
          })
        });
  
        if (!response.ok) {
          throw new Error("Department prediction failed");
        }
  
        const prediction = await response.json();
  
        const department = deptResult.rows.find(
          d => d.name === prediction.department
        );
  
        if (!department) {
          throw new Error("Predicted department not found");
        }
  
        await client.query(
          `INSERT INTO assignments 
           (tenant_id, complaint_id, assignee_type, department_id)
           VALUES ($1, $2, 'DEPARTMENT', $3)`,
          [tenantId, complaintId, department.id]
        );
  
        await client.query("COMMIT");
  
        return res.status(201).json({
          message: "Complaint created and assigned",
          assignment: {
            assignee_type: "DEPARTMENT",
            department_id: department.id,
            department_name: department.name,
            confidence: prediction.confidence,
            needs_review: prediction.needs_review
          }
        });
      }
  
      if (routingMode === "EMPLOYEE") {
        const empResult = await client.query(
          `SELECT e.id, e.title, e.vector, u.email
           FROM employees e
           JOIN users u ON u.id = e.user_id
           WHERE e.tenant_id = $1
             AND e.deleted_at IS NULL
             AND e.vector IS NOT NULL`,
          [tenantId]
        );
  
        if (empResult.rows.length === 0) {
          throw new Error("No employee vectors found");
        }
  
        const vectors: Record<string, number[]> = {};
        for (const e of empResult.rows) {
          const key = e.email || `employee_${e.id}`;
          vectors[key] = e.vector;
        }
  
        const response = await fetch(`${config.ML_SERVICE_URL}/departments/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            complaint: complaintText,
            vectors,
            confidence_threshold: 0.8
          })
        });
  
        if (!response.ok) {
          throw new Error("Employee prediction failed");
        }
  
        const prediction = await response.json();
  
        const employee = empResult.rows.find(e => {
          const key = e.email || `employee_${e.id}`;
          return key === prediction.department;
        });
  
        if (!employee) {
          throw new Error("Predicted employee not found");
        }
  
        await client.query(
          `INSERT INTO assignments
           (tenant_id, complaint_id, assignee_type, employee_id)
           VALUES ($1, $2, 'EMPLOYEE', $3)`,
          [tenantId, complaintId, employee.id]
        );
  
        await client.query("COMMIT");
  
        return res.status(201).json({
          message: "Complaint created and assigned",
          assignment: {
            assignee_type: "EMPLOYEE",
            employee_id: employee.id,
            employee_email: employee.email,
            employee_title: employee.title,
            confidence: prediction.confidence,
            needs_review: prediction.needs_review
          }
        });
      }
  
      throw new Error("Invalid routing mode");
  
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Create complaint failed:", err);
  
      return res.status(500).json({
        message: "Internal server error",
        error: err instanceof Error ? err.message : "Unknown error"
      });
    } finally {
      client.release();
    }
  };
  

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