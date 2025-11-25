import { AdminModel } from "../../src/models/admin";

export const adminModelMock: Partial<AdminModel> = {
  createAdmin: jest.fn(),
  login: jest.fn(),
  getAdminByEmail: jest.fn(),
};

export default adminModelMock as AdminModel;
