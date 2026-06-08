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

type ProfilePredictResult = {
  profile_id: string;
  confidence: number;
  needs_review: boolean;
};

async function callProfilePredict(
  complaint: string,
  vectors: Record<string, unknown>
): Promise<ProfilePredictResult> {
  const response = await fetch(`${config.ML_SERVICE_URL}/profile/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      complaint,
      vectors,
      confidence_threshold: 0.6,
    }),
  });
  const raw = await response.text();
  let data: { detail?: unknown; profile_id?: string; confidence?: number; needs_review?: boolean } = {};
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    /* non-JSON body */
  }
  if (!response.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : Array.isArray(data.detail)
          ? JSON.stringify(data.detail)
          : raw.slice(0, 800);
    throw new Error(`ML routing failed (${response.status}): ${detail}`);
  }
  if (!data.profile_id) {
    throw new Error("ML response missing profile_id");
  }
  return data as ProfilePredictResult;
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

      const vectors: Record<string, unknown> = {};
      for (const d of deptResult.rows) {
        vectors[d.id] = d.vector;
      }

      const prediction = await callProfilePredict(complaintText, vectors);

      const selected_department = prediction.profile_id;

      const department_name = deptResult.rows.find(d => d.id === selected_department)?.name;

      if (!selected_department) {
        throw new Error("Predicted routing mode not found");
      }

      const employees = await client.query(
        `SELECT id, load FROM employees WHERE tenant_id = $1 AND department_id = $2 AND deleted_at IS NULL`,
        [tenantId, selected_department]
      );

      if (employees.rows.length === 0) {
        throw new Error("No employees found");
      }

      const employee_id = employees.rows.sort((a, b) => a.load - b.load)[0].id;

      await client.query(
        `INSERT INTO assignments 
           (tenant_id, complaint_id, assignee_type, employee_id)
           VALUES ($1, $2, 'EMPLOYEE', $3)`,
        [tenantId, complaintId, employee_id]
      );

      await client.query("UPDATE employees SET load = load + 1 WHERE id = $1", [employee_id]);

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Complaint created and assigned",
        complaintId,
        assignment: {
          assignee_type: "DEPARTMENT",
          department_id: selected_department,
          department_name: department_name,
          confidence: prediction.confidence,
          needs_review: prediction.needs_review
        }
      });
    }

    if (routingMode === "EMPLOYEE") {
      const empResult = await client.query(
        `SELECT e.id, e.title, e.vector, e.name, u.email
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

      const vectors: Record<string, unknown> = {};
      for (const e of empResult.rows) {
        vectors[e.id] = e.vector;
      }

      const prediction = await callProfilePredict(complaintText, vectors);

      const selected_employee = prediction.profile_id;

      const employee = empResult.rows.find(e => e.id === selected_employee);

      if (!selected_employee || !employee) {
        throw new Error("Predicted routing mode not found");
      }

      await client.query(
        `INSERT INTO assignments
           (tenant_id, complaint_id, assignee_type, employee_id)
           VALUES ($1, $2, 'EMPLOYEE', $3)`,
        [tenantId, complaintId, selected_employee]
      );

      await client.query("UPDATE employees SET load = load + 1 WHERE id = $1", [selected_employee]);

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Complaint created and assigned",
        complaintId,
        assignment: {
          assignee_type: "EMPLOYEE",
          employee_id: employee.id,
          employee_name: employee.name,
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

export const getComplaintDetails = async (req: Request, res: Response) => {

  const { complaintId } = req.params as { complaintId: string };

  if (!complaintId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`SELECT
  c.*,
  a.*,
  u.name AS user_name,
  u.email AS user_email,
  d.name AS department_name
FROM complaints c
LEFT JOIN assignments a
  ON a.complaint_id = c.id
LEFT JOIN employees e
  ON e.id = a.employee_id
LEFT JOIN users u
  ON u.id = e.user_id
LEFT JOIN departments d
  ON d.id = a.department_id
WHERE c.id = $1`, [complaintId]);
    res.status(200).json(result.rows[0]);
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

  if (!tenantId) {
    res.status(400).json({ message: "Unauthorized" });
    return;
  }

  const client = await pool.connect();

  try {

    await client.query("UPDATE assignments SET employee_id = $1, assignee_type = 'EMPLOYEE' WHERE complaint_id = $2", [employeeId, complaintId]);
    res.status(200).json({ message: "Complaint assigned to employee successfully" });

  }
  catch (err) {
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
}

export const assignComplaintToDepartment = async (req: Request, res: Response) => {

  const { complaintId, departmentId } = req.body as { complaintId: string, departmentId: string };

  if (!complaintId || !departmentId) {
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
    await client.query("UPDATE assignments SET department_id = $1, assignee_type = 'DEPARTMENT' WHERE complaint_id = $2", [departmentId, complaintId]);
    res.status(200).json({ message: "Complaint assigned to department successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
}