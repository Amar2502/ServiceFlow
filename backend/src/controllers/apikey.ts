import { Request, Response } from "express";
import { db } from "../config/db";
import { generatehexKey, hashApiKey } from "../utils/hash";

interface GenerateApiKeyBody {
    name: string;
}

export const generateApiKey = async (req: Request, res: Response) => {

    const { name } = req.body as GenerateApiKeyBody;

    const tenantId = req.user?.tenantId;

    if (!name || !tenantId) {
        res.status(400).json({ message: "Inavlid Credentials" });
        return;
    }

    const apiKey = generatehexKey();

    const keyHash = hashApiKey(apiKey);

    try {

        const result = await db.apiKey.create({
            data: {
                keyHash,
                name,
                tenantId
            },
            select: { id: true }
        });

        res.status(201).json({
            id: result.id,
            key: apiKey,
            message: "API key generated successfully",
        });
    } 
    catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }

}

export const deleteApiKey = async (req: Request, res: Response) => {
    
    const { apiKeyId } = req.body as { apiKeyId: string };
    
    if (!apiKeyId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    try {
        await db.apiKey.delete({
            where: { id: apiKeyId }
        });
        res.status(200).json({ message: "API key deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getApiKeys = async (req: Request, res: Response) => {

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    try {
        const apiKeys = await db.apiKey.findMany({
            where: { tenantId }
        });

        const formatted = apiKeys.map(k => ({
            id: k.id,
            tenant_id: k.tenantId,
            key_hash: k.keyHash,
            name: k.name,
            last_used_at: k.lastUsedAt,
            created_at: k.createdAt
        }));

        res.status(200).json(formatted);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }

}