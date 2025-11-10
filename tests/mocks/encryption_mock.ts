import { EncryptionService } from "../../src/lib/encryption";

export const encryption_service_mock = {
    key: "mocked",
    iv: Buffer.from("mocked"),
    secretKey: "mocked",
    algorithm: "mocked",
    encrypt: jest.fn(),
    decrypt: jest.fn()
} as EncryptionService