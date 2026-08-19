import { Request, Response } from "express";
import { db } from "../../config/db";
import { generatehexKey, hashApiKey } from "../../utils/hash";

interface GenerateApiKeyBody {
  name: string;
}

export const generateApiKey = async (req: Request, res: Response) => {
  const { name } = req.body as GenerateApiKeyBody;
  const tenantId = req.user?.tenantId;

  if (!name || !tenantId) {
    res.status(400).json({ message: "Key label and tenant authentication required" });
    return;
  }

  const apiKey = generatehexKey();
  const keyHash = hashApiKey(apiKey);

  try {
    const result = await db.apiKey.create({
      data: {
        keyHash,
        name,
        tenantId,
      },
      select: { id: true },
    });

    res.status(201).json({
      id: result.id,
      key: apiKey,
      apiKey: apiKey,
      name,
      prefix: apiKey.substring(0, 8),
      message: "API key generated successfully",
    });
  } catch (err) {
    console.error("GenerateApiKey error:", err);
    res.status(500).json({ message: "Internal server error generating API key" });
  }
};

export const deleteApiKey = async (req: Request, res: Response) => {
  const { apiKeyId } = req.body as { apiKeyId: string };

  if (!apiKeyId) {
    res.status(400).json({ message: "apiKeyId is required" });
    return;
  }

  try {
    await db.apiKey.delete({
      where: { id: apiKeyId },
    });
    res.status(200).json({ message: "API key deleted successfully" });
  } catch (err) {
    console.error("DeleteApiKey error:", err);
    res.status(500).json({ message: "Internal server error deleting API key" });
  }
};

export const getApiKeys = async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const apiKeys = await db.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    const formatted = apiKeys.map((k) => ({
      id: k.id,
      tenant_id: k.tenantId,
      name: k.name || "API Key",
      key_prefix: k.keyHash ? `sk_live_${k.keyHash.substring(0, 6)}...` : "sk_live_...",
      last_used_at: k.lastUsedAt,
      created_at: k.createdAt,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("GetApiKeys error:", err);
    res.status(500).json({ message: "Internal server error fetching API keys" });
  }
};
