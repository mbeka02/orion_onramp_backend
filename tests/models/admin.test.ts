import { AdminModel } from "../../src/models/admin";
import { Errors, MyError } from "../../src/errors";
import { CreateAdminInput, LoginAdminInput } from "../../src/types/admin";
import bcrypt from "bcrypt";

// Mock the database
jest.mock("../../src/lib/db", () => ({
    db: {
        insert: jest.fn(),
        select: jest.fn(),
    },
}));

// Mock bcrypt
jest.mock("bcrypt");

describe("Admin Model", () => {
    let adminModel: AdminModel;
    const mockEmail = "admin@example.com";
    const mockPassword = "password123";
    const mockHashedPassword = "hashed_password_123";
    const mockAdminId = "admin-123";

    beforeEach(() => {
        adminModel = new AdminModel();
        jest.resetAllMocks();
        
        // Setup bcrypt mocks
        (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
    });

    describe("createAdmin", () => {
        it("should create admin when email does not exist", async () => {
            const input: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: mockHashedPassword,
            };

            const mockAdmin = {
                id: mockAdminId,
                name: input.name,
                email: input.email,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            // Mock doesAdminExist to return false
            jest.spyOn(adminModel as any, "doesAdminExist").mockResolvedValue(false);

            // Mock db.insert
            const { db } = require("../../src/lib/db");
            const mockReturning = jest.fn().mockResolvedValue([mockAdmin]);
            const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
            db.insert.mockReturnValue({ values: mockValues });

            const result = await adminModel.createAdmin(input);

            expect(result).toEqual(mockAdmin);
            expect(db.insert).toHaveBeenCalled();
        });

        it("should throw error when admin already exists", async () => {
            const input: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: mockHashedPassword,
            };

            // Mock doesAdminExist to return true
            jest.spyOn(adminModel as any, "doesAdminExist").mockResolvedValue(true);

            await expect(adminModel.createAdmin(input)).rejects.toThrow(MyError);
            await expect(adminModel.createAdmin(input)).rejects.toThrow(Errors.ADMIN_ALREADY_EXISTS);
        });

        it("should store hashed password", async () => {
            const input: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: mockHashedPassword,
            };

            const mockAdmin = {
                id: mockAdminId,
                name: input.name,
                email: input.email,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            jest.spyOn(adminModel as any, "doesAdminExist").mockResolvedValue(false);

            const { db } = require("../../src/lib/db");
            const mockReturning = jest.fn().mockResolvedValue([mockAdmin]);
            const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
            db.insert.mockReturnValue({ values: mockValues });

            await adminModel.createAdmin(input);

            expect(mockValues).toHaveBeenCalledWith({
                name: input.name,
                email: input.email,
                password: mockHashedPassword,
            });
        });
    });

    describe("login", () => {
        it("should login successfully with correct credentials", async () => {
            const input: LoginAdminInput = {
                email: mockEmail,
                password: mockPassword,
            };

            const mockAdmin = {
                id: mockAdminId,
                name: "Admin User",
                email: mockEmail,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            jest.spyOn(adminModel, "getAdminByEmail").mockResolvedValue(mockAdmin as any);
            (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

            const result = await adminModel.login(input);

            expect(result).toEqual(mockAdmin);
            expect(bcrypt.compareSync).toHaveBeenCalledWith(mockPassword, mockHashedPassword);
        });

        it("should throw error when admin not found", async () => {
            const input: LoginAdminInput = {
                email: "nonexistent@example.com",
                password: mockPassword,
            };

            jest.spyOn(adminModel, "getAdminByEmail").mockResolvedValue(undefined as any);

            await expect(adminModel.login(input)).rejects.toThrow(MyError);
            await expect(adminModel.login(input)).rejects.toThrow(Errors.WRONG_ADMIN_CREDENTIALS);
        });

        it("should throw error when password is incorrect", async () => {
            const input: LoginAdminInput = {
                email: mockEmail,
                password: "wrong_password",
            };

            const mockAdmin = {
                id: mockAdminId,
                name: "Admin User",
                email: mockEmail,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            jest.spyOn(adminModel, "getAdminByEmail").mockResolvedValue(mockAdmin as any);
            (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

            await expect(adminModel.login(input)).rejects.toThrow(MyError);
            await expect(adminModel.login(input)).rejects.toThrow(Errors.WRONG_ADMIN_CREDENTIALS);
        });

        it("should compare password correctly", async () => {
            const input: LoginAdminInput = {
                email: mockEmail,
                password: mockPassword,
            };

            const mockAdmin = {
                id: mockAdminId,
                name: "Admin User",
                email: mockEmail,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            jest.spyOn(adminModel, "getAdminByEmail").mockResolvedValue(mockAdmin as any);
            (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

            await adminModel.login(input);

            expect(bcrypt.compareSync).toHaveBeenCalledWith(mockPassword, mockHashedPassword);
        });
    });

    describe("getAdminByEmail", () => {
        it("should return admin when found", async () => {
            const mockAdmin = {
                id: mockAdminId,
                name: "Admin User",
                email: mockEmail,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            const { db } = require("../../src/lib/db");
            const mockWhere = jest.fn().mockResolvedValue([mockAdmin]);
            const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
            db.select.mockReturnValue({ from: mockFrom });

            const result = await adminModel.getAdminByEmail(mockEmail);

            expect(result).toEqual(mockAdmin);
        });

        it("should return undefined when admin not found", async () => {
            const { db } = require("../../src/lib/db");
            const mockWhere = jest.fn().mockResolvedValue([]);
            const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
            db.select.mockReturnValue({ from: mockFrom });

            const result = await adminModel.getAdminByEmail("nonexistent@example.com");

            expect(result).toBeUndefined();
        });
    });

    describe("doesAdminExist", () => {
        it("should return true when admin exists", async () => {
            const mockAdmin = {
                id: mockAdminId,
                name: "Admin User",
                email: mockEmail,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            const { db } = require("../../src/lib/db");
            const mockWhere = jest.fn().mockResolvedValue([mockAdmin]);
            const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
            db.select.mockReturnValue({ from: mockFrom });

            const result = await (adminModel as any).doesAdminExist(mockEmail);

            expect(result).toBe(true);
        });

        it("should return false when admin does not exist", async () => {
            const { db } = require("../../src/lib/db");
            const mockWhere = jest.fn().mockResolvedValue([]);
            const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
            db.select.mockReturnValue({ from: mockFrom });

            const result = await (adminModel as any).doesAdminExist("nonexistent@example.com");

            expect(result).toBe(false);
        });
    });

    describe("edge cases", () => {
        it("should handle database errors gracefully on create", async () => {
            const input: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: mockHashedPassword,
            };

            jest.spyOn(adminModel as any, "doesAdminExist").mockRejectedValue(new Error("Database error"));

            await expect(adminModel.createAdmin(input)).rejects.toThrow("Database error");
        });

        it("should handle database errors gracefully on login", async () => {
            const input: LoginAdminInput = {
                email: mockEmail,
                password: mockPassword,
            };

            jest.spyOn(adminModel, "getAdminByEmail").mockRejectedValue(new Error("Database error"));

            await expect(adminModel.login(input)).rejects.toThrow("Database error");
        });

        it("should handle email case sensitivity", async () => {
            const mockAdmin = {
                id: mockAdminId,
                name: "Admin User",
                email: mockEmail.toLowerCase(),
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            const { db } = require("../../src/lib/db");
            const mockWhere = jest.fn().mockResolvedValue([mockAdmin]);
            const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
            db.select.mockReturnValue({ from: mockFrom });

            const result = await adminModel.getAdminByEmail(mockEmail.toUpperCase());

            expect(mockWhere).toHaveBeenCalled();
        });
    });
});
