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
  
    const keywordArray = keywords
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);
  
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
  
      const departmentId = insertResult.rows[0].id;
  
      // 2️⃣ Vectorize THIS department only
      const response = await fetch(`${config.ML_SERVICE_URL}/departments/vectorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departments: [
            {
              id: departmentId,
              name,
              keyword: keywordArray.join(", ")
            }
          ]
        })
      });
  
      if (!response.ok) {
        throw new Error("Department vectorization failed");
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
          keywords: keywordArray
        },
        vector_dimension: vectorData.vector_dimension,
        model_version: vectorData.model_version
      });
  
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Create department failed:", err);
  
      return res.status(500).json({
        message: "Internal server error",
        error: err instanceof Error ? err.message : "Unknown error"
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