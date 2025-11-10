import environmentController from "../../src/controllers/environments";
import { Errors, MyError } from "../../src/errors";
import { CreateEnvironmentType, ENVIRONMENT_TYPES } from "../../src/types/environments";
import { encryption_service_mock } from "../mocks/encryption_mock";
import { environmentModelMock } from "../mocks/environment_model_mock";

describe("Environment Controller: Create Key Tests", () => {
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

describe("Environment Controller: Rotate Key Tests", () => {
    const business = "existing id";
    const non_existing_environment = ENVIRONMENT_TYPES.LIVE;
    const existing_environment = ENVIRONMENT_TYPES.TEST;
    const old_public_key = "old_publick";
    const old_encrypted_private_key = "old_encrypted_private";
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

            environmentModelMock.rotateKey = jest.fn().mockImplementation(() => {
                return new Promise((res, rej) => {
                    res(null);
                })
            });

            environmentModelMock.getLatestValidBusinessEnvironmentKeys = jest.fn().mockImplementation((business_id: string, environment_type: ENVIRONMENT_TYPES) => {
                return new Promise((res, rej) => {
                    if (business_id === business && environment_type === existing_environment) {
                        res({public_key: old_public_key, encrypted_private_key: old_encrypted_private_key})
                    } else {
                        res(null)
                    }
                })
            })

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
    });

    it("should fail if business does not have the environment", async () => {
        try {
            await environmentController.rotateKeys(business, non_existing_environment, environmentModelMock, encryption_service_mock);
            expect(false).toBe(true);
        } catch(err) {
            if (err instanceof MyError) {
                if (err.message === Errors.BUSINESS_DOES_NOT_HAVE_ENVIRONMENT) {
                    expect(true).toBe(true)
                } else {
                    console.error("Unexpected error", err);
                    expect(true).toBe(false);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should create the new key", async () => {
        try {
            await environmentController.rotateKeys(business, existing_environment, environmentModelMock, encryption_service_mock);
            
            // Test that new keys were created
            expect(environmentModelMock.createKeys).toHaveBeenCalled();
            // Test that new keys were encrypted
            expect(encryption_service_mock.encrypt).toHaveBeenCalledWith(private_key);
            // Test that new keys were stored and the old one added a validUntil Date
            expect(environmentModelMock.rotateKey).toHaveBeenCalledWith(business, existing_environment, public_key, encrypted_private_key, old_public_key)
        } catch(err) {
            console.error("Unexpected error", err);
            expect(false).toBe(true)
        }
    })
})