import "dotenv/config";
import crypto from "crypto";

class EncryptionService {
    private secretKey: string;
    algorithm = 'aes-256-gcm';
    private key: string;
    private iv: Buffer;

    constructor() {
        if (!process.env.SECRET_KEY) {
            throw new Error("Invalid env setup, set SECRET_KEY in env variables");
        }

        this.secretKey = process.env.SECRET_KEY;
        this.key = crypto.createHash("sha512").update(this.secretKey).digest("hex").substring(0, 32);
        this.iv = crypto.randomBytes(16);
    }

    encrypt(data: string): string {
        const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.key), this.iv);
        let encrypted = cipher.update(data, "utf-8", "hex");
        encrypted += cipher.final("hex");

        return this.iv.toString("hex") + encrypted;
    }

    decrypt(data: string): string {
        const inputIV = data.slice(0, 32);
        const encrypted = data.slice(32);
        const decipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.key), Buffer.from(inputIV, "hex"));

        let decryped = decipher.update(encrypted, "hex", "utf-8");
        decryped += decipher.final("utf-8");
        return decryped;
    }
}

const encryptionService = new EncryptionService();
export default encryptionService