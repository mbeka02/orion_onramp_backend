import { Admincontroller } from "../../src/controllers/admin";
import { Errors, MyError } from "../../src/errors";
import { adminModelMock } from "../mocks/admin_model_mock";
import { CreateAdminInput, LoginAdminInput } from "../../src/types/admin";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Mock bcrypt and jwt
jest.mock("bcrypt");
jest.mock("jsonwebtoken");

describe("Admin Controller", () => {
    const adminController = new Admincontroller();
    const mockAdminId = "admin-123";
    const mockEmail = "admin@example.com";
    const mockPassword = "password123";
    const mockHashedPassword = "hashed_password_123";
    const mockToken = "jwt_token_123";

    beforeEach(() => {
        jest.resetAllMocks();
        process.env.JWT_SECRET_KEY = "test-secret-key";
        
        // Setup bcrypt mocks
        (bcrypt.genSaltSync as jest.Mock).mockReturnValue("salt");
        (bcrypt.hashSync as jest.Mock).mockReturnValue(mockHashedPassword);
        (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
        
        // Setup jwt mock
        (jwt.sign as jest.Mock).mockReturnValue(mockToken);
    });

    describe("createadmin", () => {
        it("should create admin successfully", async () => {
            const input: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: mockPassword,
            };

            const mockAdmin = {
                id: mockAdminId,
                name: input.name,
                email: input.email,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            (adminModelMock.createAdmin as jest.Mock).mockResolvedValue(mockAdmin);

            const result = await adminController.createadmin(input, adminModelMock as any);

            expect(bcrypt.genSaltSync).toHaveBeenCalledWith(10);
            expect(bcrypt.hashSync).toHaveBeenCalledWith(mockPassword, "salt");
            expect(adminModelMock.createAdmin).toHaveBeenCalledWith({
                ...input,
                password: mockHashedPassword,
            });
            expect(jwt.sign).toHaveBeenCalledWith(
                { adminId: mockAdminId, email: mockEmail },
                "test-secret-key",
                { expiresIn: "7d" }
            );
            expect(result).toEqual({
                admin: mockAdmin,
                token: mockToken,
            });
        });

        it("should hash password with correct salt rounds", async () => {
            const input: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: mockPassword,
            };

            const mockAdmin = {
                id: mockAdminId,
                name: input.name,
                email: input.email,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            (adminModelMock.createAdmin as jest.Mock).mockResolvedValue(mockAdmin);

            await adminController.createadmin(input, adminModelMock as any);

            expect(bcrypt.genSaltSync).toHaveBeenCalledWith(10);
        });

        it("should throw MyError when admin already exists", async () => {
            const input: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: mockPassword,
            };

            (adminModelMock.createAdmin as jest.Mock).mockRejectedValue(
                new MyError(Errors.ADMIN_ALREADY_EXISTS)
            );

            await expect(
                adminController.createadmin(input, adminModelMock as any)
            ).rejects.toThrow(MyError);
            await expect(
                adminController.createadmin(input, adminModelMock as any)
            ).rejects.toThrow(Errors.ADMIN_ALREADY_EXISTS);
        });

        it("should throw generic error for unexpected errors", async () => {
            const input: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: mockPassword,
            };

            (adminModelMock.createAdmin as jest.Mock).mockRejectedValue(
                new Error("Database connection failed")
            );

            await expect(
                adminController.createadmin(input, adminModelMock as any)
            ).rejects.toThrow(Errors.INTERNAL_SERVER_ERROR);
        });

        it("should generate valid JWT token with correct payload", async () => {
            const input: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: mockPassword,
            };

            const mockAdmin = {
                id: mockAdminId,
                name: input.name,
                email: input.email,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            (adminModelMock.createAdmin as jest.Mock).mockResolvedValue(mockAdmin);

            await adminController.createadmin(input, adminModelMock as any);

            expect(jwt.sign).toHaveBeenCalledWith(
                { adminId: mockAdminId, email: mockEmail },
                "test-secret-key",
                { expiresIn: "7d" }
            );
        });
    });

    describe("login", () => {
        it("should login admin successfully", async () => {
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

            (adminModelMock.login as jest.Mock).mockResolvedValue(mockAdmin);

            const result = await adminController.login(input, adminModelMock as any);

            expect(adminModelMock.login).toHaveBeenCalledWith(input);
            expect(jwt.sign).toHaveBeenCalledWith(
                { adminId: mockAdminId, email: mockEmail },
                "test-secret-key",
                { expiresIn: "7d" }
            );
            expect(result).toEqual({
                admin: mockAdmin,
                token: mockToken,
            });
        });

        it("should throw MyError when credentials are wrong", async () => {
            const input: LoginAdminInput = {
                email: mockEmail,
                password: "wrong_password",
            };

            (adminModelMock.login as jest.Mock).mockRejectedValue(
                new MyError(Errors.WRONG_ADMIN_CREDENTIALS)
            );

            await expect(
                adminController.login(input, adminModelMock as any)
            ).rejects.toThrow(MyError);
            await expect(
                adminController.login(input, adminModelMock as any)
            ).rejects.toThrow(Errors.WRONG_ADMIN_CREDENTIALS);
        });

        it("should throw MyError when admin not found", async () => {
            const input: LoginAdminInput = {
                email: "nonexistent@example.com",
                password: mockPassword,
            };

            (adminModelMock.login as jest.Mock).mockRejectedValue(
                new MyError(Errors.WRONG_ADMIN_CREDENTIALS)
            );

            await expect(
                adminController.login(input, adminModelMock as any)
            ).rejects.toThrow(MyError);
        });

        it("should throw generic error for unexpected errors", async () => {
            const input: LoginAdminInput = {
                email: mockEmail,
                password: mockPassword,
            };

            (adminModelMock.login as jest.Mock).mockRejectedValue(
                new Error("Database connection failed")
            );

            await expect(
                adminController.login(input, adminModelMock as any)
            ).rejects.toThrow(Errors.INTERNAL_SERVER_ERROR);
        });

        it("should return same token format as signup", async () => {
            const signupInput: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: mockPassword,
            };

            const loginInput: LoginAdminInput = {
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

            (adminModelMock.createAdmin as jest.Mock).mockResolvedValue(mockAdmin);
            (adminModelMock.login as jest.Mock).mockResolvedValue(mockAdmin);

            const signupResult = await adminController.createadmin(signupInput, adminModelMock as any);
            const loginResult = await adminController.login(loginInput, adminModelMock as any);

            expect(typeof signupResult.token).toBe("string");
            expect(typeof loginResult.token).toBe("string");
            expect(signupResult.token).toBe(mockToken);
            expect(loginResult.token).toBe(mockToken);
        });
    });

    describe("edge cases", () => {
        it("should handle empty password", async () => {
            const input: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: "",
            };

            const mockAdmin = {
                id: mockAdminId,
                name: input.name,
                email: input.email,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            (adminModelMock.createAdmin as jest.Mock).mockResolvedValue(mockAdmin);

            await adminController.createadmin(input, adminModelMock as any);

            expect(bcrypt.hashSync).toHaveBeenCalledWith("", "salt");
        });

        it("should handle special characters in password", async () => {
            const specialPassword = "P@ssw0rd!#$%^&*()";
            const input: CreateAdminInput = {
                name: "Admin User",
                email: mockEmail,
                password: specialPassword,
            };

            const mockAdmin = {
                id: mockAdminId,
                name: input.name,
                email: input.email,
                password: mockHashedPassword,
                createdAt: new Date(),
            };

            (adminModelMock.createAdmin as jest.Mock).mockResolvedValue(mockAdmin);

            await adminController.createadmin(input, adminModelMock as any);

            expect(bcrypt.hashSync).toHaveBeenCalledWith(specialPassword, "salt");
        });

        it("should handle missing JWT_SECRET_KEY environment variable", async () => {
            delete process.env.JWT_SECRET_KEY;

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

            (adminModelMock.login as jest.Mock).mockResolvedValue(mockAdmin);

            await adminController.login(input, adminModelMock as any);

            // Should still call jwt.sign but with undefined secret
            expect(jwt.sign).toHaveBeenCalledWith(
                { adminId: mockAdminId, email: mockEmail },
                undefined,
                { expiresIn: "7d" }
            );
        });
    });
});
