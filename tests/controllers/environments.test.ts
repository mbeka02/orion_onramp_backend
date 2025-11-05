import environmentController from "../../src/controllers/environments";
import { Errors, MyError } from "../../src/errors";
import { CreateEnvironmentType, ENVIRONMENT_TYPES } from "../../src/types/environments";
import { environmentModelMock } from "../mocks/environment_model_mock";

describe("Environment Controller Tests", () => {
    const business = "existing id";
    const non_existing_environment = ENVIRONMENT_TYPES.LIVE;
    const existing_environment = ENVIRONMENT_TYPES.TEST

    beforeAll(async () => {
        try {
            environmentModelMock.doesBusinessAlreadyHaveEnvironment = jest.fn().mockImplementation((business_id: string, environment_type: ENVIRONMENT_TYPES) => {
                return new Promise((res, rej) => {
                    if (business_id === business && environment_type === non_existing_environment) {
                        res(false);
                    } else if (business_id === business && environment_type === existing_environment) {
                        res(true);
                    } else {
                        rej("Invalid arguments");
                    }
                })
            })
        } catch(err) {
            console.error("Error setting up mocks");
        }
    })

    it("should fail if business already has an environment of the same type", async () => {
        try {
            const args: CreateEnvironmentType = {
                type: existing_environment
            };
            await environmentController.create(args, business, environmentModelMock);
            expect(false).toBe(true);
        } catch(err) {
            if (err instanceof MyError) {
                if (err.message === Errors.BUSINESS_ALREADY_HAS_ENVIRONMENT) {
                    expect(true).toBe(true);
                } else {
                    console.error(err);
                    expect(true).toBe(false);
                }
            } else {
                console.error(err);
                expect(false).toBe(true);
            }
        }
    });
})