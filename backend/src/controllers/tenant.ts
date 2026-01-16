import { Request, Response } from "express";
import pool from "../config/db";

export const updateTenant = async (req: Request, res: Response) => {

    const { tenantId, name, routingMode } = req.body as { tenantId: string, name: string, routingMode: string };

    if (!tenantId || !name || !routingMode) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {

        const result = await client.query("UPDATE tenants SET name = $1, routing_mode = $2 WHERE id = $3 RETURNING id, name, routing_mode", [name, routingMode, tenantId]);

        res.status(200).json({
            id: result.rows[0].id,
            name: result.rows[0].name,
            routingMode: result.rows[0].routing_mode,
            message: "Tenant updated successfully"
        });
        
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const getTenantDetailsForML = async (req: Request, res: Response) => {  

    const { tenantId } = req.body as { tenantId: string };

    if (!tenantId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();
  
    try {

        const tenantResult = await client.query("SELECT id, name FROM tenants WHERE id = $1", [tenantId]);
  
      if (tenantResult.rows.length === 0) {
        res.status(404).json({ message: "Tenant not found" });
        return;
      }
  
      // 2. Departments
      const departmentResult = await client.query(
        `
        SELECT id, name
        FROM departments
        WHERE tenant_id = $1
        `,
        [tenantId]
      );
  
      // 3. Employees (active only)
      const employeeResult = await client.query(
        `
        SELECT id, user_id, department_id
        FROM employees
        WHERE tenant_id = $1
          AND deleted_at IS NULL
        `,
        [tenantId]
      );
  
      const departments = departmentResult.rows;
      const employees = employeeResult.rows;
  
      res.status(200).json({
        tenantId,
        tenantName: tenantResult.rows[0].name,
  
        hasEmployees: employees.length > 0,
        employees,
  
        hasDepartments: departments.length > 0,
        departments
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    } finally {
      client.release();
    }
  };
  