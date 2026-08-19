import bcrypt from 'bcrypt';
import crypto from 'crypto';

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
};

export const hashPasswordDev = async (password: string): Promise<string> => {
    return await hashPassword(password);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    if (!password || !hash) return false;
    try {
        if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
            return await bcrypt.compare(password, hash);
        }
    } catch {
        // Fallback below
    }
    // Fallback for legacy dev plaintext passwords
    return password === hash;
};

export const comparePasswordDev = async (password: string, hash: string): Promise<boolean> => {
    return await comparePassword(password, hash);
};

export const hashApiKey = (apiKey: string) => {
    return crypto
      .createHash("sha256")
      .update(apiKey)
      .digest("hex");
};

export const generatehexKey = () => {
    return "sf_live_" + crypto.randomBytes(24).toString("hex");
};