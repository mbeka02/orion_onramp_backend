import { EnvironmentModel } from "../../src/models/environments";

export const environmentModelMock = {
    doesBusinessAlreadyHaveEnvironment: jest.fn(),
    storeEnvironment: jest.fn(),
    createKeys: jest.fn()
} as EnvironmentModel