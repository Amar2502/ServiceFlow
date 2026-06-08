import { Request, Response } from "express";
import pool from "../config/db";

export const updateTenantName = async (req: Request, res: Response) => {

    const { tenantId, name } = req.body as { tenantId: string, name: string };

    if (!tenantId || !name) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {

        const result = await client.query("UPDATE tenants SET name = $1 WHERE id = $2 RETURNING id, name", [name, tenantId]);

        res.status(200).json({
            id: result.rows[0].id,
            name: result.rows[0].name,
            message: "Tenant updated successfully"
        });
        
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const updateTenantRoutingMode = async (req: Request, res: Response) => {

    const { tenantId, routingMode } = req.body as { tenantId: string, routingMode: "DEPARTMENT" | "EMPLOYEE" };

    if (!tenantId || !routingMode) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {
        
        const result = await client.query("UPDATE tenants SET routing_mode = $1 WHERE id = $2 RETURNING id, routing_mode", [routingMode, tenantId]);

        res.status(200).json({
            id: result.rows[0].id,
            routing_mode: result.rows[0].routing_mode,
            message: "Tenant routing mode updated successfully"
        });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}