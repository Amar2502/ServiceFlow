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
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (keywordArray.length === 0) {
    return res.status(400).json({ message: "At least one keyword is required" });
  }

  console.log("Processed keywords:", keywordArray);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // TF-IDF is one global model per classifier process: every vectorize refits vocabulary.
    // Fit once on ALL tenant department keywords so every stored vector matches the same model.
    const existingResult = await client.query(
      `SELECT id, keywords FROM departments WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC`,
      [tenantId]
    );

    type Range = { id: string | null; start: number; len: number; isNew: boolean };
    const units: { id: string | null; keywords: string[] }[] = [
      ...existingResult.rows.map((r) => ({
        id: r.id as string,
        keywords: Array.isArray(r.keywords) ? (r.keywords as string[]) : [],
      })),
      { id: null, keywords: keywordArray },
    ];

    const flat: string[] = [];
    const ranges: Range[] = [];
    let offset = 0;
    for (const u of units) {
      if (u.keywords.length === 0) continue;
      ranges.push({
        id: u.id,
        start: offset,
        len: u.keywords.length,
        isNew: u.id === null,
      });
      flat.push(...u.keywords);
      offset += u.keywords.length;
    }

    if (flat.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "At least one keyword is required" });
    }

    const response = await fetch(`${config.ML_SERVICE_URL}/profile/vectorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_keywords: flat,
      }),
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
        errorMessage =
          typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }

      console.error("Classifier error:", JSON.stringify(errorData, null, 2), "Status:", response.status);
      throw new Error(`Department vectorization failed: ${errorMessage}`);
    }

    const vectorData = await response.json();
    const matrix = vectorData.vectors as unknown[] | undefined;

    if (!matrix || !Array.isArray(matrix)) {
      throw new Error("Vector not returned by ML service");
    }

    let newDepartmentId: string | null = null;
    for (const r of ranges) {
      const block = matrix.slice(r.start, r.start + r.len);
      const stored = JSON.stringify(block);
      if (r.isNew) {
        const ins = await client.query(
          `INSERT INTO departments (name, keywords, vector, tenant_id) VALUES ($1, $2, $3, $4) RETURNING id`,
          [name, keywordArray, stored, tenantId]
        );
        newDepartmentId = ins.rows[0].id as string;
      } else if (r.id) {
        await client.query(
          `UPDATE departments SET vector = $1 WHERE id = $2 AND tenant_id = $3`,
          [stored, r.id, tenantId]
        );
      }
    }

    if (!newDepartmentId) {
      throw new Error("Failed to create department record");
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Department created successfully",
      department: {
        id: newDepartmentId,
        name,
        keywords: keywordArray,
      },
      vector_dimension: vectorData.vector_dimension,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
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