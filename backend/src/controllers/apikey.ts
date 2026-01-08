import { Request, Response } from "express";
import pool from "../config/db";
import { config } from "../config/config";
import { generatehexKey, hashApiKey } from "../utils/hash";

export const generateApiKey = async (req: Request, res: Response) => {

    const { name } = req.body as { name: string };

    const tenantId = req.user?.tenantId;

    if (!name || !tenantId) {
        res.status(400).json({ message: "Inavlid Credentials" });
        return;
    }

    const apiKey = generatehexKey();

    const keyHash = hashApiKey(apiKey);

    const client = await pool.connect();

    try {

        const result = await client.query("INSERT INTO api_keys (key_hash, name, tenant_id) VALUES ($1, $2, $3) RETURNING id", [keyHash, name, tenantId]);


        res.status(201).json({
            id: result.rows[0].id,
            key: apiKey,
            message: "API key generated successfully",
        });
    } 
    catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }

}

export const deleteApiKey = async (req: Request, res: Response) => {
    
    const { apiKeyId } = req.body as { apiKeyId: string };
    
    if (!apiKeyId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query("DELETE FROM api_keys WHERE id = $1", [apiKeyId]);
        res.status(200).json({ message: "API key deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}