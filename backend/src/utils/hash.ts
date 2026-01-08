import bcrypt from 'bcrypt';
import crypto from 'crypto';

export const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, 10);
}

export const hashPasswordDev = (password: string) => {
    return password;
}

export const comparePassword = async (password: string, hash: string) => {
    return await bcrypt.compare(password, hash);
}

export const comparePasswordDev = (password: string, hash: string) => {
    return password === hash;
}

export const hashApiKey = (apiKey: string) => {
    return crypto
      .createHash("sha256")
      .update(apiKey)
      .digest("hex");
}

export const generatehexKey = () => {
    return "sf_live_" + crypto.randomBytes(24).toString("hex");
}