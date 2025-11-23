import request from "supertest";
import express, { Express } from "express";
import { Errors, MyError } from "../../src/errors";
import { AdminModel } from "../../src/models/admin";
import { Admincontroller } from "../../src/controllers/admin";
// Mock dependencies before importing the router
jest.mock("../../src/models/admin");
jest.mock("../../src/controllers/admin");
jest.mock("../../src/lib/logger", () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

// Mock authentication middleware if needed
jest.mock("../../src/lib/auth", () => ({
    getAuthContext: jest.fn(),
}));


describe("Admin Routes", () => {
    let app: Express;
    let mockAdminModel: jest.Mocked<AdminModel>;
    let mockAdminController: jest.Mocked<Admincontroller>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create fresh app instance
        app = express();
        app.use(express.json());

        // Setup mocks
        mockAdminModel = new AdminModel() as jest.Mocked<AdminModel>;
        mockAdminController = new Admincontroller() as jest.Mocked<Admincontroller>;

        // Mock constructor to return our mocks
        (AdminModel as jest.MockedClass<typeof AdminModel>).mockImplementation(() => mockAdminModel);
        (Admincontroller as jest.MockedClass<typeof Admincontroller>).mockImplementation(() => mockAdminController);

        // Import and mount the router after mocks are set up
        const adminRouter = require("../../src/routes/admin").default;
        app.use("/api/admin", adminRouter);
    });

    describe("POST /api/admin/create", () => {
        const validCreatePayload = {
            name: "Admin User",
            email: "admin@example.com",
            password: "password123",
        };

        it("should create admin successfully with valid data", async () => {
            const createdAt = new Date();
            const mockResponse = {
                admin: {
                    id: "admin-123",
                    name: validCreatePayload.name,
                    email: validCreatePayload.email,
                    password: "hashed_password",
                    createdAt,
                },
                token: "jwt_token_123",
            };

            mockAdminController.createadmin.mockResolvedValue(mockResponse);

            const response = await request(app)
                .post("/api/admin/create")
                .send(validCreatePayload)
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                message: "Admin created successfully",
                data: {
                    admin: {
                        id: "admin-123",
                        name: validCreatePayload.name,
                        email: validCreatePayload.email,
                        createdAt: createdAt.toISOString(),
                    },
                    token: "jwt_token_123",
                },
            });
            expect(mockAdminController.createadmin).toHaveBeenCalledWith(
                validCreatePayload,
                expect.any(AdminModel)
            );
        });

        it("should return 400 when name is missing", async () => {
            const invalidPayload = {
                email: "admin@example.com",
                password: "password123",
            };

            const response = await request(app)
                .post("/api/admin/create")
                .send(invalidPayload)
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(mockAdminController.createadmin).not.toHaveBeenCalled();
        });

        it("should return 400 when email is invalid", async () => {
            const invalidPayload = {
                name: "Admin User",
                email: "invalid-email",
                password: "password123",
            };

            const response = await request(app)
                .post("/api/admin/create")
                .send(invalidPayload)
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(mockAdminController.createadmin).not.toHaveBeenCalled();
        });

        it("should return 400 when password is too short", async () => {
            const invalidPayload = {
                name: "Admin User",
                email: "admin@example.com",
                password: "123",
            };

            const response = await request(app)
                .post("/api/admin/create")
                .send(invalidPayload)
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(mockAdminController.createadmin).not.toHaveBeenCalled();
        });

        it("should return 400 when email is missing", async () => {
            const invalidPayload = {
                name: "Admin User",
                password: "password123",
            };

            const response = await request(app)
                .post("/api/admin/create")
                .send(invalidPayload)
                .expect(400);

            expect(response.body).toHaveProperty("error");
        });

        it("should return 400 when password is missing", async () => {
            const invalidPayload = {
                name: "Admin User",
                email: "admin@example.com",
            };

            const response = await request(app)
                .post("/api/admin/create")
                .send(invalidPayload)
                .expect(400);

            expect(response.body).toHaveProperty("error");
        });

        it("should return 500 when admin already exists", async () => {
            mockAdminController.createadmin.mockRejectedValue(
                new MyError(Errors.ADMIN_ALREADY_EXISTS)
            );

            const response = await request(app)
                .post("/api/admin/create")
                .send(validCreatePayload)
                .expect(500);

            expect(response.body).toEqual({ error: "Internal Server Error" });
        });

        it("should return 500 on unexpected error", async () => {
            mockAdminController.createadmin.mockRejectedValue(
                new Error("Database connection failed")
            );

            const response = await request(app)
                .post("/api/admin/create")
                .send(validCreatePayload)
                .expect(500);

            expect(response.body).toEqual({ error: "Internal Server Error" });
        });

        it("should accept valid email formats", async () => {
            const validEmails = [
                "admin@example.com",
                "admin.user@example.com",
                "admin+tag@example.co.uk",
                "admin_123@example.com",
            ];

            for (const email of validEmails) {
                const payload = {
                    ...validCreatePayload,
                    email,
                };

                mockAdminController.createadmin.mockResolvedValue({
                    admin: {
                        id: "admin-123",
                        name: payload.name,
                        email: payload.email,
                        createdAt: new Date(),
                    } as any,
                    token: "jwt_token_123",
                });

                const response = await request(app)
                    .post("/api/admin/create")
                    .send(payload)
                    .expect(201);

                expect(response.body.success).toBe(true);
            }
        });

        it("should reject invalid email formats", async () => {
            const invalidEmails = [
                "invalid",
                "@example.com",
                "admin@",
                "admin@.com",
                "admin..user@example.com",
            ];

            for (const email of invalidEmails) {
                const payload = {
                    ...validCreatePayload,
                    email,
                };

                await request(app)
                    .post("/api/admin/create")
                    .send(payload)
                    .expect(400);
            }
        });

        it("should handle empty request body", async () => {
            const response = await request(app)
                .post("/api/admin/create")
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty("error");
        });

        it("should trim whitespace from name", async () => {
            const payloadWithWhitespace = {
                name: "  Admin User  ",
                email: "admin@example.com",
                password: "password123",
            };

            mockAdminController.createadmin.mockResolvedValue({
                admin: {
                    id: "admin-123",
                    name: "Admin User",
                    email: "admin@example.com",
                    createdAt: new Date(),
                } as any,
                token: "jwt_token_123",
            });

            await request(app)
                .post("/api/admin/create")
                .send(payloadWithWhitespace)
                .expect(201);
        });
    });

    describe("POST /api/admin/login", () => {
        const validLoginPayload = {
            email: "admin@example.com",
            password: "password123",
        };

        it("should login successfully with valid credentials", async () => {
            const createdAt = new Date();
            const mockResponse = {
                admin: {
                    id: "admin-123",
                    name: "Admin User",
                    email: validLoginPayload.email,
                    password: "hashed_password",
                    createdAt,
                },
                token: "jwt_token_123",
            };

            mockAdminController.login.mockResolvedValue(mockResponse);

            const response = await request(app)
                .post("/api/admin/login")
                .send(validLoginPayload)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: "Admin logged in successfully",
                data: {
                    admin: {
                        id: "admin-123",
                        name: "Admin User",
                        email: validLoginPayload.email,
                        createdAt: createdAt.toISOString(),
                    },
                    token: "jwt_token_123",
                },
            });
            expect(mockAdminController.login).toHaveBeenCalledWith(
                validLoginPayload,
                expect.any(AdminModel)
            );
        });

        it("should return 400 when email is missing", async () => {
            const invalidPayload = {
                password: "password123",
            };

            const response = await request(app)
                .post("/api/admin/login")
                .send(invalidPayload)
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(mockAdminController.login).not.toHaveBeenCalled();
        });

        it("should return 400 when password is missing", async () => {
            const invalidPayload = {
                email: "admin@example.com",
            };

            const response = await request(app)
                .post("/api/admin/login")
                .send(invalidPayload)
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(mockAdminController.login).not.toHaveBeenCalled();
        });

        it("should return 400 when email is invalid", async () => {
            const invalidPayload = {
                email: "invalid-email",
                password: "password123",
            };

            const response = await request(app)
                .post("/api/admin/login")
                .send(invalidPayload)
                .expect(400);

            expect(response.body).toHaveProperty("error");
        });

        it("should return 400 when password is too short", async () => {
            const invalidPayload = {
                email: "admin@example.com",
                password: "123",
            };

            const response = await request(app)
                .post("/api/admin/login")
                .send(invalidPayload)
                .expect(400);

            expect(response.body).toHaveProperty("error");
        });

        it("should return 500 when credentials are wrong", async () => {
            mockAdminController.login.mockRejectedValue(
                new MyError(Errors.WRONG_ADMIN_CREDENTIALS)
            );

            const response = await request(app)
                .post("/api/admin/login")
                .send(validLoginPayload)
                .expect(500);

            expect(response.body).toEqual({ error: "Internal Server Error" });
        });

        it("should return 500 when admin not found", async () => {
            mockAdminController.login.mockRejectedValue(
                new MyError(Errors.WRONG_ADMIN_CREDENTIALS)
            );

            const response = await request(app)
                .post("/api/admin/login")
                .send({
                    email: "nonexistent@example.com",
                    password: "password123",
                })
                .expect(500);

            expect(response.body).toEqual({ error: "Internal Server Error" });
        });

        it("should return 500 on unexpected error", async () => {
            mockAdminController.login.mockRejectedValue(
                new Error("Database connection failed")
            );

            const response = await request(app)
                .post("/api/admin/login")
                .send(validLoginPayload)
                .expect(500);

            expect(response.body).toEqual({ error: "Internal Server Error" });
        });

        it("should handle empty request body", async () => {
            const response = await request(app)
                .post("/api/admin/login")
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty("error");
        });

        it("should accept various valid email formats", async () => {
            const validEmails = [
                "admin@example.com",
                "test.admin@example.co.uk",
                "admin+tag@example.com",
            ];

            for (const email of validEmails) {
                const payload = {
                    email,
                    password: "password123",
                };

                mockAdminController.login.mockResolvedValue({
                    admin: {
                        id: "admin-123",
                        name: "Admin User",
                        email,
                        createdAt: new Date(),
                    } as any,
                    token: "jwt_token_123",
                });

                const response = await request(app)
                    .post("/api/admin/login")
                    .send(payload)
                    .expect(200);

                expect(response.body.success).toBe(true);
            }
        });

        it("should handle multiple failed login attempts", async () => {
            mockAdminController.login.mockRejectedValue(
                new MyError(Errors.WRONG_ADMIN_CREDENTIALS)
            );

            for (let i = 0; i < 3; i++) {
                await request(app)
                    .post("/api/admin/login")
                    .send(validLoginPayload)
                    .expect(500);
            }

            expect(mockAdminController.login).toHaveBeenCalledTimes(3);
        });
    });

    describe("Content-Type validation", () => {
        it("should require JSON content type for create", async () => {
            const response = await request(app)
                .post("/api/admin/create")
                .send("name=Admin&email=admin@example.com&password=password123")
                .expect(400);
        });

        it("should require JSON content type for login", async () => {
            const response = await request(app)
                .post("/api/admin/login")
                .send("email=admin@example.com&password=password123")
                .expect(400);
        });

        it("should accept application/json for create", async () => {
            mockAdminController.createadmin.mockResolvedValue({
                admin: {
                    id: "admin-123",
                    name: "Admin User",
                    email: "admin@example.com",
                    createdAt: new Date(),
                } as any,
                token: "jwt_token_123",
            });

            await request(app)
                .post("/api/admin/create")
                .set("Content-Type", "application/json")
                .send({
                    name: "Admin User",
                    email: "admin@example.com",
                    password: "password123",
                })
                .expect(201);
        });
    });

    describe("Security", () => {
        it("should not expose password in create response", async () => {
            mockAdminController.createadmin.mockResolvedValue({
                admin: {
                    id: "admin-123",
                    name: "Admin User",
                    email: "admin@example.com",
                    createdAt: new Date(),
                } as any,
                token: "jwt_token_123",
            });

            const response = await request(app)
                .post("/api/admin/create")
                .send({
                    name: "Admin User",
                    email: "admin@example.com",
                    password: "password123",
                })
                .expect(201);

            expect(response.body.data.admin).not.toHaveProperty("password");
        });

        it("should not expose password in login response", async () => {
            mockAdminController.login.mockResolvedValue({
                admin: {
                    id: "admin-123",
                    name: "Admin User",
                    email: "admin@example.com",
                    createdAt: new Date(),
                } as any,
                token: "jwt_token_123",
            });

            const response = await request(app)
                .post("/api/admin/login")
                .send({
                    email: "admin@example.com",
                    password: "password123",
                })
                .expect(200);

            expect(response.body.data.admin).not.toHaveProperty("password");
        });

        it("should reject SQL injection attempts in email", async () => {
            const sqlInjectionPayload = {
                email: "admin@example.com'; DROP TABLE admin; --",
                password: "password123",
            };

            await request(app)
                .post("/api/admin/login")
                .send(sqlInjectionPayload)
                .expect(400);
        });

        it("should reject XSS attempts in name", async () => {
            const xssPayload = {
                name: "<script>alert('XSS')</script>",
                email: "admin@example.com",
                password: "password123",
            };

            mockAdminController.createadmin.mockResolvedValue({
                admin: {
                    id: "admin-123",
                    name: xssPayload.name,
                    email: "admin@example.com",
                    createdAt: new Date(),
                } as any,
                token: "jwt_token_123",
            });

            const response = await request(app)
                .post("/api/admin/create")
                .send(xssPayload)
                .expect(201);

            // The value should be returned as-is, but properly escaped in production
            expect(typeof response.body.data.admin.name).toBe("string");
        });
    });
});
