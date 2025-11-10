import environmentController from "../../src/controllers/environments";
import { Errors, MyError } from "../../src/errors";
import { CreateEnvironmentType, ENVIRONMENT_TYPES } from "../../src/types/environments";
import { encryption_service_mock } from "../mocks/encryption_mock";
import { environmentModelMock } from "../mocks/environment_model_mock";

describe("Environment Controller Tests", () => {
    const business = "existing id";
    const non_existing_environment = ENVIRONMENT_TYPES.LIVE;
    const existing_environment = ENVIRONMENT_TYPES.TEST;
    const created_environment_id = "created environment";
    const public_key = "publick";
    const private_key = "private";
    const encrypted_private_key = "encrypted_private";

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
            });

            environmentModelMock.storeEnvironment = jest.fn().mockImplementation(environment => {
                return new Promise((res, rej) => {
                    res(created_environment_id);
                })
            });

            environmentModelMock.createKeys = jest.fn().mockImplementation(() => {
                return ({ public_key: public_key, private_key: private_key });
            });

            encryption_service_mock.encrypt = jest.fn().mockImplementation((text) => {
                if (text !== private_key) {
                    throw new Error("Invalid arguement");
                }

                return encrypted_private_key;
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
            await environmentController.create(args, business, environmentModelMock, encryption_service_mock);
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

    it("should create the environment", async () => {
        try {
            const args: CreateEnvironmentType = {
                type: non_existing_environment
            };

            const environmentID = await environmentController.create(args, business, environmentModelMock, encryption_service_mock);

            expect(environmentModelMock.createKeys).toHaveBeenCalled();
            expect(encryption_service_mock.encrypt).toHaveBeenCalledWith(private_key)
            expect(environmentModelMock.storeEnvironment).toHaveBeenCalledWith({ 
                type: args.type, 
                public_key: public_key, 
                private_key: encrypted_private_key, 
                business_id: business 
            });
            expect(environmentID).toBe(created_environment_id);
        } catch(err) {
            console.error(err);
            expect(false).toBe(true);
        }
    })
})