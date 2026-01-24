import { Request, Response } from "express";
import pool from "../config/db";
import { config } from "../config/config";

export const createDepartment = async (req: Request, res: Response) => {
  const { name, keywords } = req.body as { name: string; keywords: string };

  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!name || !keywords) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // ✅ Clean keywords string and convert to array
  const keywordArray = keywords
    .replace(/[^\w\s]/g, "") // remove punctuation
    .trim()
    .split(/\s+/)            // split by spaces
    .filter(Boolean);        // remove empty strings

  if (keywordArray.length === 0) {
    return res.status(400).json({ message: "At least one keyword is required" });
  }

  console.log("Processed keywords:", keywordArray);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Create department
    const insertResult = await client.query(
      `INSERT INTO departments (name, keywords, tenant_id)
       VALUES ($1, $2, $3)
       RETURNING id, name`,
      [name, keywordArray, tenantId]
    );

    if (!insertResult.rows || insertResult.rows.length === 0) {
      throw new Error("Failed to create department - no data returned");
    }

    const departmentId = insertResult.rows[0]?.id;

    if (!departmentId) {
      throw new Error("Failed to create department - id is null or undefined");
    }

    console.log("Created department with ID:", departmentId);

    // 2️⃣ Vectorize THIS department only
    const response = await fetch(`${config.ML_SERVICE_URL}/departments/vectorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        departments: [
          {
            id: departmentId,
            name,
            keyword: keywordArray, // ✅ send as array
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      let errorMessage = "Department vectorization failed";

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
      throw new Error(`Department vectorization failed: ${errorMessage}`);
    }

    const vectorData = await response.json();
    const vector = vectorData.vectors?.[name];

    if (!vector) {
      throw new Error("Vector not returned by ML service");
    }

    // 3️⃣ Store vector
    await client.query(
      `UPDATE departments
       SET vector = $1
       WHERE id = $2 AND tenant_id = $3`,
      [JSON.stringify(vector), departmentId, tenantId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Department created successfully",
      department: {
        id: departmentId,
        name,
        keywords: keywordArray,
      },
      vector_dimension: vectorData.vector_dimension,
      model_version: vectorData.model_version,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create department failed:", err);

    return res.status(500).json({
      message: "Internal server error",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  } finally {
    client.release();
  }
};


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