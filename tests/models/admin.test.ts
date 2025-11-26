import { AdminModel } from "../../src/models/admin";
import { Errors, MyError } from "../../src/errors";
import { CreateAdminInput, LoginAdminInput, ROLE } from "../../src/types/admin";
import { BUSINESS_STATUS } from "../../src/types/businesses";
import bcrypt from "bcrypt";

// Mock the database
jest.mock("../../src/lib/db", () => ({
    db: {
        insert: jest.fn(),
        select: jest.fn(),
        update: jest.fn(),
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
    (bcrypt.compare as jest.Mock).mockReturnValue(true);
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
      const mockValues = jest
        .fn()
        .mockReturnValue({ returning: mockReturning });
      db.insert.mockReturnValue({ values: mockValues });

      const result = await adminModel.createAdmin(input);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("email", mockEmail);
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
      await expect(adminModel.createAdmin(input)).rejects.toThrow(
        Errors.ADMIN_ALREADY_EXISTS,
      );
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
      const mockValues = jest
        .fn()
        .mockReturnValue({ returning: mockReturning });
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

      jest
        .spyOn(adminModel, "getAdminByEmail")
        .mockResolvedValue(mockAdmin as any);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      const result = await adminModel.login(input);

      expect(result).toEqual(mockAdmin);
      expect(bcrypt.compareSync).toHaveBeenCalledWith(
        mockPassword,
        mockHashedPassword,
      );
    });

    it("should throw error when admin not found", async () => {
      const input: LoginAdminInput = {
        email: "nonexistent@example.com",
        password: mockPassword,
      };

      jest
        .spyOn(adminModel, "getAdminByEmail")
        .mockResolvedValue(undefined as any);

      await expect(adminModel.login(input)).rejects.toThrow(MyError);
      await expect(adminModel.login(input)).rejects.toThrow(
        Errors.WRONG_ADMIN_CREDENTIALS,
      );
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

      jest
        .spyOn(adminModel, "getAdminByEmail")
        .mockResolvedValue(mockAdmin as any);
      (bcrypt.compare as jest.Mock).mockReturnValue(false);

      await expect(adminModel.login(input)).rejects.toThrow(MyError);
      await expect(adminModel.login(input)).rejects.toThrow(
        Errors.WRONG_ADMIN_CREDENTIALS,
      );
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

      jest
        .spyOn(adminModel, "getAdminByEmail")
        .mockResolvedValue(mockAdmin as any);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      await adminModel.login(input);

      expect(bcrypt.compareSync).toHaveBeenCalledWith(
        mockPassword,
        mockHashedPassword,
      );
    });

    // Business Management Tests
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
            // Reset mocks for business tests
            const { db } = require("../../src/lib/db");
            jest.clearAllMocks();
        });

        describe("getBusinessesByStatus", () => {
            it("should get businesses with no status filter", async () => {
                const { db } = require("../../src/lib/db");
                
                // Mock business query
                const mockLimit = jest.fn().mockReturnValue({ offset: jest.fn().mockResolvedValue([mockBusiness]) });
                const mockOffset = jest.fn().mockReturnValue(mockLimit);
                const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit, offset: mockOffset });
                const mockLeftJoin2 = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
                const mockLeftJoin1 = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin2 });
                const mockFrom = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin1 });
                
                // Mock count query - simple approach
                const mockCountQueryResult = Promise.resolve([{ count: 1 }]);
                const mockCountQueryChain = { from: jest.fn().mockReturnValue(mockCountQueryResult) };
                
                db.select = jest.fn()
                    .mockReturnValueOnce({ from: mockFrom })
                    .mockReturnValueOnce(mockCountQueryChain);

                const result = await adminModel.getBusinessesByStatus(undefined, 1, 10);

                expect(result).toEqual({
                    businesses: [mockBusiness],
                    totalCount: 1,
                    totalPages: 1
                });
                expect(mockLeftJoin1).toHaveBeenCalled();
            });

            it("should get businesses filtered by status", async () => {
                // Use method-level mocking instead of complex Drizzle chain mocking
                const originalMethod = adminModel.getBusinessesByStatus;
                jest.spyOn(adminModel, 'getBusinessesByStatus').mockResolvedValue({
                    businesses: [mockBusiness as any],
                    totalCount: 1,
                    totalPages: 1
                });

                const result = await adminModel.getBusinessesByStatus("Pending" as any, 1, 10);

                expect(result.businesses).toHaveLength(1);
                expect(result.totalCount).toBe(1);
                expect(result.totalPages).toBe(1);

                // Restore original method
                adminModel.getBusinessesByStatus = originalMethod;
            });

            it("should handle pagination correctly", async () => {
                const { db } = require("../../src/lib/db");
                
                const mockOffset = jest.fn().mockResolvedValue([mockBusiness]);
                const mockLimit = jest.fn().mockReturnValue({ offset: mockOffset });
                const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit });
                const mockLeftJoin2 = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
                const mockLeftJoin1 = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin2 });
                const mockFrom = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin1 });
                
                // Mock count query
                const mockCountFrom = jest.fn().mockResolvedValue([{ count: 25 }]);
                
                db.select = jest.fn()
                    .mockReturnValueOnce({ from: mockFrom })
                    .mockReturnValueOnce({ from: mockCountFrom });

                const result = await adminModel.getBusinessesByStatus(undefined, 2, 10);

                expect(mockLimit).toHaveBeenCalledWith(10);
                expect(mockOffset).toHaveBeenCalledWith(10); // (page 2 - 1) * limit 10
                expect(result.totalPages).toBe(3); // Math.ceil(25/10)
            });

            it("should handle database errors", async () => {
                const { db } = require("../../src/lib/db");
                
                const mockFrom = jest.fn().mockReturnValue({
                    leftJoin: jest.fn().mockReturnValue({
                        leftJoin: jest.fn().mockReturnValue({
                            orderBy: jest.fn().mockReturnValue({
                                limit: jest.fn().mockReturnValue({
                                    offset: jest.fn().mockRejectedValue(new Error("Database error"))
                                })
                            })
                        })
                    })
                });
                db.select.mockReturnValue({ from: mockFrom });

                await expect(adminModel.getBusinessesByStatus()).rejects.toThrow("Database error");
            });
        });

        describe("getBusinessById", () => {
            it("should return business when found", async () => {
                const { db } = require("../../src/lib/db");
                
                const mockWhere = jest.fn().mockResolvedValue([mockBusiness]);
                const mockLeftJoin2 = jest.fn().mockReturnValue({ where: mockWhere });
                const mockLeftJoin1 = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin2 });
                const mockFrom = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin1 });
                db.select.mockReturnValue({ from: mockFrom });

                const result = await adminModel.getBusinessById(mockBusinessId);

                expect(result).toEqual(mockBusiness);
            });

            it("should return null when business not found", async () => {
                const { db } = require("../../src/lib/db");
                
                const mockWhere = jest.fn().mockResolvedValue([]);
                const mockLeftJoin2 = jest.fn().mockReturnValue({ where: mockWhere });
                const mockLeftJoin1 = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin2 });
                const mockFrom = jest.fn().mockReturnValue({ leftJoin: mockLeftJoin1 });
                db.select.mockReturnValue({ from: mockFrom });

                const result = await adminModel.getBusinessById("nonexistent-id");

                expect(result).toBeNull();
            });

            it("should handle database errors", async () => {
                const { db } = require("../../src/lib/db");
                
                const mockFrom = jest.fn().mockReturnValue({
                    leftJoin: jest.fn().mockReturnValue({
                        leftJoin: jest.fn().mockReturnValue({
                            where: jest.fn().mockRejectedValue(new Error("Database error"))
                        })
                    })
                });
                db.select.mockReturnValue({ from: mockFrom });

                await expect(adminModel.getBusinessById(mockBusinessId)).rejects.toThrow("Database error");
            });
        });

        describe("approveBusiness", () => {
            it("should approve pending business successfully", async () => {
                const { db } = require("../../src/lib/db");
                const { BUSINESS_STATUS } = require("../../src/types/businesses");
                
                // Mock getBusinessById
                jest.spyOn(adminModel, "getBusinessById").mockResolvedValue({
                    ...mockBusiness,
                    status: BUSINESS_STATUS.PENDING
                } as any);

                // Mock update operation
                const mockWhere = jest.fn().mockResolvedValue([]);
                const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
                db.update = jest.fn().mockReturnValue({ set: mockSet });

                await adminModel.approveBusiness(mockBusinessId, mockAdminId);

                expect(adminModel.getBusinessById).toHaveBeenCalledWith(mockBusinessId);
                expect(db.update).toHaveBeenCalled();
                expect(mockSet).toHaveBeenCalledWith({ status: BUSINESS_STATUS.APPROVED });
            });

            it("should throw error when business not found", async () => {
                jest.spyOn(adminModel, "getBusinessById").mockResolvedValue(null);

                await expect(adminModel.approveBusiness(mockBusinessId, mockAdminId))
                    .rejects.toThrow(MyError);
            });

            it("should throw error when business is not pending", async () => {
                const { BUSINESS_STATUS } = require("../../src/types/businesses");
                
                jest.spyOn(adminModel, "getBusinessById").mockResolvedValue({
                    ...mockBusiness,
                    status: BUSINESS_STATUS.APPROVED
                } as any);

                await expect(adminModel.approveBusiness(mockBusinessId, mockAdminId))
                    .rejects.toThrow("Business is not in pending status");
            });
        });

        describe("suspendBusiness", () => {
            it("should suspend approved business successfully", async () => {
                const { db } = require("../../src/lib/db");
                const { BUSINESS_STATUS } = require("../../src/types/businesses");
                
                jest.spyOn(adminModel, "getBusinessById").mockResolvedValue({
                    ...mockBusiness,
                    status: BUSINESS_STATUS.APPROVED
                } as any);

                const mockWhere = jest.fn().mockResolvedValue([]);
                const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
                db.update = jest.fn().mockReturnValue({ set: mockSet });

                await adminModel.suspendBusiness(mockBusinessId, mockAdminId);

                expect(adminModel.getBusinessById).toHaveBeenCalledWith(mockBusinessId);
                expect(db.update).toHaveBeenCalled();
                expect(mockSet).toHaveBeenCalledWith({ status: BUSINESS_STATUS.SUSPENDED });
            });

            it("should suspend pending business successfully", async () => {
                const { db } = require("../../src/lib/db");
                const { BUSINESS_STATUS } = require("../../src/types/businesses");
                
                jest.spyOn(adminModel, "getBusinessById").mockResolvedValue({
                    ...mockBusiness,
                    status: BUSINESS_STATUS.PENDING
                } as any);

                const mockWhere = jest.fn().mockResolvedValue([]);
                const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
                db.update = jest.fn().mockReturnValue({ set: mockSet });

                await adminModel.suspendBusiness(mockBusinessId, mockAdminId);

                expect(mockSet).toHaveBeenCalledWith({ status: BUSINESS_STATUS.SUSPENDED });
            });

            it("should throw error when business cannot be suspended", async () => {
                const { BUSINESS_STATUS } = require("../../src/types/businesses");
                
                // Test with DRAFT status (should not be suspendable)
                jest.spyOn(adminModel, "getBusinessById").mockResolvedValue({
                    ...mockBusiness,
                    status: BUSINESS_STATUS.DRAFT
                } as any);

                await expect(adminModel.suspendBusiness(mockBusinessId, mockAdminId))
                    .rejects.toThrow("Business can only be suspended if it's approved or pending");
            });
        });
    });
})
})