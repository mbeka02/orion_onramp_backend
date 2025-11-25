import { EnvironmentModel } from "../../src/models/environments";

export const environmentModelMock = {
  doesBusinessAlreadyHaveEnvironment: jest.fn(),
  storeEnvironment: jest.fn(),
  createKeys: jest.fn(),
  rotateKey: jest.fn(),
  getLatestValidBusinessEnvironmentKeys: jest.fn(),
  getBusinessEnvironments: jest.fn(),
} as EnvironmentModel;
