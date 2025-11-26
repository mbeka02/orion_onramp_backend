import { Admincontroller } from "../../src/controllers/admin";
import { Errors, MyError } from "../../src/errors";
import { adminModelMock } from "../mocks/admin_model_mock";
import { CreateAdminInput, LoginAdminInput, ROLE } from "../../src/types/admin";
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
                { adminId: mockAdminId, email: mockEmail, role: ROLE.ADMIN },
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
                { adminId: mockAdminId, email: mockEmail, role: ROLE.ADMIN },
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

    // Business Management Controller Tests
    describe("Business Management", () => {
        const mockBusinessId = "business-123";
        const mockBusiness = {
            id: mockBusinessId,
            ownerId: "user-123",
            tradingName: "Test Business",
            description: "Test business description",
            staffSize: "1-10",
            annualSalesVolume: "100000",
            businessType: "Starter business",
            industryName: "Technology",
            categoryName: "Software",
            legalBusinessName: "Test Business Ltd",
            registrationtype: "Registered Company",
            generalEmail: "info@test.com",
            supportEmail: "support@test.com",
            disputesEmail: "disputes@test.com",
            phoneNumber: "+254123456789",
            website: "https://test.com",
            twitterHandle: "@test",
            facebookPage: "test",
            instagramHandle: "test",
            country: "Kenya",
            city: "Nairobi",
            streetaddress: "123 Test St",
            building: "Test Building",
            postalcode: "00100",
            cryptoWalletAddress: "0x123...",
            revenuePin: "P123456789A",
            businessRegistrationCertificate: "cert123",
            businessRegistrationNumber: "BN123456",
            status: "Pending",
            createdAt: new Date(),
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        describe("getBusinessesByStatus", () => {
            it("should get businesses successfully with no status filter", async () => {
                const mockResult = {
                    businesses: [mockBusiness],
                    totalCount: 1,
                    totalPages: 1
                };

                (adminModelMock.getBusinessesByStatus as jest.Mock).mockResolvedValue(mockResult);

                const result = await adminController.getBusinessesByStatus(undefined, 1, 10, adminModelMock as any);

                expect(adminModelMock.getBusinessesByStatus).toHaveBeenCalledWith(undefined, 1, 10);
                expect(result).toEqual(mockResult);
            });

            it("should get businesses successfully with status filter", async () => {
                const { BUSINESS_STATUS } = require("../../src/types/businesses");
                const mockResult = {
                    businesses: [mockBusiness],
                    totalCount: 1,
                    totalPages: 1
                };

                (adminModelMock.getBusinessesByStatus as jest.Mock).mockResolvedValue(mockResult);

                const result = await adminController.getBusinessesByStatus(
                    BUSINESS_STATUS.PENDING, 
                    1, 
                    10, 
                    adminModelMock as any
                );

                expect(adminModelMock.getBusinessesByStatus).toHaveBeenCalledWith(BUSINESS_STATUS.PENDING, 1, 10);
                expect(result).toEqual(mockResult);
            });

            it("should validate page parameter", async () => {
                await expect(
                    adminController.getBusinessesByStatus(undefined, 0, 10, adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.getBusinessesByStatus(undefined, 0, 10, adminModelMock as any)
                ).rejects.toThrow("Page must be greater than 0");

                await expect(
                    adminController.getBusinessesByStatus(undefined, -1, 10, adminModelMock as any)
                ).rejects.toThrow("Page must be greater than 0");
            });

            it("should validate limit parameter", async () => {
                await expect(
                    adminController.getBusinessesByStatus(undefined, 1, 0, adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.getBusinessesByStatus(undefined, 1, 0, adminModelMock as any)
                ).rejects.toThrow("Limit must be between 1 and 100");

                await expect(
                    adminController.getBusinessesByStatus(undefined, 1, 101, adminModelMock as any)
                ).rejects.toThrow("Limit must be between 1 and 100");

                await expect(
                    adminController.getBusinessesByStatus(undefined, 1, -1, adminModelMock as any)
                ).rejects.toThrow("Limit must be between 1 and 100");
            });

            it("should handle model errors gracefully", async () => {
                (adminModelMock.getBusinessesByStatus as jest.Mock).mockRejectedValue(
                    new Error("Database connection failed")
                );

                await expect(
                    adminController.getBusinessesByStatus(undefined, 1, 10, adminModelMock as any)
                ).rejects.toThrow(Errors.INTERNAL_SERVER_ERROR);
            });

            it("should pass through MyError from model", async () => {
                (adminModelMock.getBusinessesByStatus as jest.Mock).mockRejectedValue(
                    new MyError("Custom business error")
                );

                await expect(
                    adminController.getBusinessesByStatus(undefined, 1, 10, adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.getBusinessesByStatus(undefined, 1, 10, adminModelMock as any)
                ).rejects.toThrow("Custom business error");
            });

            it("should handle edge case pagination values", async () => {
                const mockResult = {
                    businesses: [],
                    totalCount: 0,
                    totalPages: 0
                };

                (adminModelMock.getBusinessesByStatus as jest.Mock).mockResolvedValue(mockResult);

                // Test maximum allowed limit
                const result = await adminController.getBusinessesByStatus(undefined, 1, 100, adminModelMock as any);

                expect(adminModelMock.getBusinessesByStatus).toHaveBeenCalledWith(undefined, 1, 100);
                expect(result).toEqual(mockResult);

                // Test minimum allowed values
                await adminController.getBusinessesByStatus(undefined, 1, 1, adminModelMock as any);
                expect(adminModelMock.getBusinessesByStatus).toHaveBeenCalledWith(undefined, 1, 1);
            });
        });

        describe("getBusinessById", () => {
            it("should get business successfully", async () => {
                (adminModelMock.getBusinessById as jest.Mock).mockResolvedValue(mockBusiness);

                const result = await adminController.getBusinessById(mockBusinessId, adminModelMock as any);

                expect(adminModelMock.getBusinessById).toHaveBeenCalledWith(mockBusinessId);
                expect(result).toEqual(mockBusiness);
            });

            it("should throw error for empty business ID", async () => {
                await expect(
                    adminController.getBusinessById("", adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.getBusinessById("", adminModelMock as any)
                ).rejects.toThrow("Business ID is required");
            });

            it("should throw error when business not found", async () => {
                (adminModelMock.getBusinessById as jest.Mock).mockResolvedValue(null);

                await expect(
                    adminController.getBusinessById(mockBusinessId, adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.getBusinessById(mockBusinessId, adminModelMock as any)
                ).rejects.toThrow(Errors.BUSINESS_NOT_FOUND);
            });

            it("should handle model errors gracefully", async () => {
                (adminModelMock.getBusinessById as jest.Mock).mockRejectedValue(
                    new Error("Database connection failed")
                );

                await expect(
                    adminController.getBusinessById(mockBusinessId, adminModelMock as any)
                ).rejects.toThrow(Errors.INTERNAL_SERVER_ERROR);
            });

            it("should pass through MyError from model", async () => {
                (adminModelMock.getBusinessById as jest.Mock).mockRejectedValue(
                    new MyError("Custom business error")
                );

                await expect(
                    adminController.getBusinessById(mockBusinessId, adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.getBusinessById(mockBusinessId, adminModelMock as any)
                ).rejects.toThrow("Custom business error");
            });

            it("should handle various business ID formats", async () => {
                const validUUIDs = [
                    "123e4567-e89b-12d3-a456-426614174000",
                    "550e8400-e29b-41d4-a716-446655440000",
                    "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
                ];

                (adminModelMock.getBusinessById as jest.Mock).mockResolvedValue(mockBusiness);

                for (const uuid of validUUIDs) {
                    await adminController.getBusinessById(uuid, adminModelMock as any);
                    expect(adminModelMock.getBusinessById).toHaveBeenCalledWith(uuid);
                }
            });
        });

        describe("approveBusiness", () => {
            it("should approve business successfully", async () => {
                (adminModelMock.approveBusiness as jest.Mock).mockResolvedValue(undefined);

                const result = await adminController.approveBusiness(
                    mockBusinessId, 
                    mockAdminId, 
                    adminModelMock as any
                );

                expect(adminModelMock.approveBusiness).toHaveBeenCalledWith(mockBusinessId, mockAdminId);
                expect(result).toEqual({ message: "Business approved successfully" });
            });

            it("should throw error for empty business ID", async () => {
                await expect(
                    adminController.approveBusiness("", mockAdminId, adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.approveBusiness("", mockAdminId, adminModelMock as any)
                ).rejects.toThrow("Business ID is required");
            });

            it("should throw error for empty admin ID", async () => {
                await expect(
                    adminController.approveBusiness(mockBusinessId, "", adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.approveBusiness(mockBusinessId, "", adminModelMock as any)
                ).rejects.toThrow("Admin ID is required");
            });

            it("should handle model errors gracefully", async () => {
                (adminModelMock.approveBusiness as jest.Mock).mockRejectedValue(
                    new Error("Database connection failed")
                );

                await expect(
                    adminController.approveBusiness(mockBusinessId, mockAdminId, adminModelMock as any)
                ).rejects.toThrow(Errors.INTERNAL_SERVER_ERROR);
            });

            it("should pass through MyError from model", async () => {
                (adminModelMock.approveBusiness as jest.Mock).mockRejectedValue(
                    new MyError("Business is not in pending status")
                );

                await expect(
                    adminController.approveBusiness(mockBusinessId, mockAdminId, adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.approveBusiness(mockBusinessId, mockAdminId, adminModelMock as any)
                ).rejects.toThrow("Business is not in pending status");
            });

            it("should handle undefined parameters", async () => {
                await expect(
                    adminController.approveBusiness(undefined as any, mockAdminId, adminModelMock as any)
                ).rejects.toThrow("Business ID is required");

                await expect(
                    adminController.approveBusiness(mockBusinessId, undefined as any, adminModelMock as any)
                ).rejects.toThrow("Admin ID is required");

                await expect(
                    adminController.approveBusiness(undefined as any, undefined as any, adminModelMock as any)
                ).rejects.toThrow("Business ID is required");
            });

            it("should handle null parameters", async () => {
                await expect(
                    adminController.approveBusiness(null as any, mockAdminId, adminModelMock as any)
                ).rejects.toThrow("Business ID is required");

                await expect(
                    adminController.approveBusiness(mockBusinessId, null as any, adminModelMock as any)
                ).rejects.toThrow("Admin ID is required");
            });
        });

        describe("suspendBusiness", () => {
            it("should suspend business successfully", async () => {
                (adminModelMock.suspendBusiness as jest.Mock).mockResolvedValue(undefined);

                const result = await adminController.suspendBusiness(
                    mockBusinessId, 
                    mockAdminId, 
                    adminModelMock as any
                );

                expect(adminModelMock.suspendBusiness).toHaveBeenCalledWith(mockBusinessId, mockAdminId);
                expect(result).toEqual({ message: "Business suspended successfully" });
            });

            it("should throw error for empty business ID", async () => {
                await expect(
                    adminController.suspendBusiness("", mockAdminId, adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.suspendBusiness("", mockAdminId, adminModelMock as any)
                ).rejects.toThrow("Business ID is required");
            });

            it("should throw error for empty admin ID", async () => {
                await expect(
                    adminController.suspendBusiness(mockBusinessId, "", adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.suspendBusiness(mockBusinessId, "", adminModelMock as any)
                ).rejects.toThrow("Admin ID is required");
            });

            it("should handle model errors gracefully", async () => {
                (adminModelMock.suspendBusiness as jest.Mock).mockRejectedValue(
                    new Error("Database connection failed")
                );

                await expect(
                    adminController.suspendBusiness(mockBusinessId, mockAdminId, adminModelMock as any)
                ).rejects.toThrow(Errors.INTERNAL_SERVER_ERROR);
            });

            it("should pass through MyError from model", async () => {
                (adminModelMock.suspendBusiness as jest.Mock).mockRejectedValue(
                    new MyError("Business can only be suspended if it's approved or pending")
                );

                await expect(
                    adminController.suspendBusiness(mockBusinessId, mockAdminId, adminModelMock as any)
                ).rejects.toThrow(MyError);
                await expect(
                    adminController.suspendBusiness(mockBusinessId, mockAdminId, adminModelMock as any)
                ).rejects.toThrow("Business can only be suspended if it's approved or pending");
            });

            it("should handle undefined parameters", async () => {
                await expect(
                    adminController.suspendBusiness(undefined as any, mockAdminId, adminModelMock as any)
                ).rejects.toThrow("Business ID is required");

                await expect(
                    adminController.suspendBusiness(mockBusinessId, undefined as any, adminModelMock as any)
                ).rejects.toThrow("Admin ID is required");
            });

            it("should handle null parameters", async () => {
                await expect(
                    adminController.suspendBusiness(null as any, mockAdminId, adminModelMock as any)
                ).rejects.toThrow("Business ID is required");

                await expect(
                    adminController.suspendBusiness(mockBusinessId, null as any, adminModelMock as any)
                ).rejects.toThrow("Admin ID is required");
            });

            it("should handle whitespace-only parameters", async () => {
                await expect(
                    adminController.suspendBusiness("   ", mockAdminId, adminModelMock as any)
                ).rejects.toThrow("Business ID is required");

                await expect(
                    adminController.suspendBusiness(mockBusinessId, "   ", adminModelMock as any)
                ).rejects.toThrow("Admin ID is required");
            });
        });

        describe("business management integration scenarios", () => {
            it("should handle sequential business operations", async () => {
                // First, get businesses
                const mockBusinessList = {
                    businesses: [{ ...mockBusiness, status: "Pending" }],
                    totalCount: 1,
                    totalPages: 1
                };
                (adminModelMock.getBusinessesByStatus as jest.Mock).mockResolvedValue(mockBusinessList);

                // Get pending businesses
                const businesses = await adminController.getBusinessesByStatus(
                    "Pending" as any, 1, 10, adminModelMock as any
                );
                expect(businesses.businesses).toHaveLength(1);

                // Then get specific business
                (adminModelMock.getBusinessById as jest.Mock).mockResolvedValue({
                    ...mockBusiness, 
                    status: "Pending"
                });

                const business = await adminController.getBusinessById(mockBusinessId, adminModelMock as any);
                expect(business.status).toBe("Pending");

                // Then approve it
                (adminModelMock.approveBusiness as jest.Mock).mockResolvedValue(undefined);

                const approvalResult = await adminController.approveBusiness(
                    mockBusinessId, mockAdminId, adminModelMock as any
                );
                expect(approvalResult.message).toBe("Business approved successfully");

                // Verify all operations were called
                expect(adminModelMock.getBusinessesByStatus).toHaveBeenCalled();
                expect(adminModelMock.getBusinessById).toHaveBeenCalled();
                expect(adminModelMock.approveBusiness).toHaveBeenCalled();
            });

            it("should handle concurrent operation attempts", async () => {
                (adminModelMock.approveBusiness as jest.Mock).mockResolvedValue(undefined);
                (adminModelMock.suspendBusiness as jest.Mock).mockResolvedValue(undefined);

                // Simulate concurrent approval and suspension attempts
                const approvePromise = adminController.approveBusiness(
                    mockBusinessId, mockAdminId, adminModelMock as any
                );
                const suspendPromise = adminController.suspendBusiness(
                    mockBusinessId, mockAdminId, adminModelMock as any
                );

                const results = await Promise.all([approvePromise, suspendPromise]);

                expect(results[0].message).toBe("Business approved successfully");
                expect(results[1].message).toBe("Business suspended successfully");
                expect(adminModelMock.approveBusiness).toHaveBeenCalledWith(mockBusinessId, mockAdminId);
                expect(adminModelMock.suspendBusiness).toHaveBeenCalledWith(mockBusinessId, mockAdminId);
            });

            it("should handle business management with different admin users", async () => {
                const admin1Id = "admin-001";
                const admin2Id = "admin-002";

                (adminModelMock.approveBusiness as jest.Mock).mockResolvedValue(undefined);
                (adminModelMock.suspendBusiness as jest.Mock).mockResolvedValue(undefined);

                // Different admins performing different operations
                await adminController.approveBusiness(mockBusinessId, admin1Id, adminModelMock as any);
                await adminController.suspendBusiness(mockBusinessId, admin2Id, adminModelMock as any);

                expect(adminModelMock.approveBusiness).toHaveBeenCalledWith(mockBusinessId, admin1Id);
                expect(adminModelMock.suspendBusiness).toHaveBeenCalledWith(mockBusinessId, admin2Id);
            });

            it("should handle large pagination requests efficiently", async () => {
                const largeMockResult = {
                    businesses: Array.from({ length: 100 }, (_, i) => ({
                        ...mockBusiness,
                        id: `business-${i}`,
                        tradingName: `Business ${i}`
                    })),
                    totalCount: 10000,
                    totalPages: 100
                };

                (adminModelMock.getBusinessesByStatus as jest.Mock).mockResolvedValue(largeMockResult);

                const result = await adminController.getBusinessesByStatus(
                    undefined, 1, 100, adminModelMock as any
                );

                expect(result.businesses).toHaveLength(100);
                expect(result.totalCount).toBe(10000);
                expect(result.totalPages).toBe(100);
                expect(adminModelMock.getBusinessesByStatus).toHaveBeenCalledWith(undefined, 1, 100);
            });
        });
    });
});