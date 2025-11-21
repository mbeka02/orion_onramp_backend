import environmentController from "../../src/controllers/environments";
import { Errors, MyError } from "../../src/errors";
import { CreateEnvironmentType, ENVIRONMENT_TYPES } from "../../src/types/environments";
import businessModelMock from "../mocks/business_model_mock";
import { encryption_service_mock } from "../mocks/encryption_mock";
import { environmentModelMock } from "../mocks/environment_model_mock";

describe("Environment Controller: Create Key Tests", () => {
    const business = "existing id";
    const unapprovedBusiness = "unapproved business id";
    const liveEnvironment = ENVIRONMENT_TYPES.LIVE;
    const adminUser = "admin";
    const nonAdminUser = "not admin";
    const non_existing_environment = ENVIRONMENT_TYPES.LIVE;
    const existing_environment = ENVIRONMENT_TYPES.TEST;
    const created_environment_id = "created environment";
    const public_key = "publick";
    const private_key = "private";
    const encrypted_private_key = "encrypted_private";
    const hashed_private_key = "hashed_private";

    beforeAll(async () => {
        try {
            businessModelMock.isBusinessApproved = jest.fn().mockImplementation((business_id) => {
                return new Promise((res, rej) => {
                    if (business_id === unapprovedBusiness) {
                        res(false);
                    } else if (business_id === business) {
                        res(true);
                    } else {
                        rej("Unexpected input");
                    }
                })
            })

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
            });

            encryption_service_mock.hash = jest.fn().mockImplementation((text: string) => {
                if (text !== private_key) {
                    throw new Error("Invalid arguement");
                }

                return hashed_private_key;
            })

            businessModelMock.isUserOwnerOrAdmin = jest.fn().mockImplementation((business_id: string, user_id: string) => {
                return new Promise((res, rej) => {
                    if (user_id === adminUser && business_id === business || business_id === unapprovedBusiness) {
                        res(true);
                    } else {
                        res(false);
                    }
                })
            })
        } catch (err) {
            console.error("Error setting up mocks");
        }
    })

    it("should fail if business already has an environment of the same type", async () => {
        try {
            const args: CreateEnvironmentType = {
                type: existing_environment,
                businessID: business
            };
            await environmentController.create(args, adminUser, environmentModelMock, encryption_service_mock, businessModelMock);
            expect(false).toBe(true);
        } catch (err) {
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

    it("should fail if user is not owner or admin of business", async () => {
        try {
            const args: CreateEnvironmentType = {
                type: non_existing_environment,
                businessID: business
            }
            await environmentController.create(args, nonAdminUser, environmentModelMock, encryption_service_mock, businessModelMock);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.UNAUTHORIZED) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should fail if environment is live but business is not approved", async () => {
        try {
            const args: CreateEnvironmentType = {
                type: liveEnvironment,
                businessID: unapprovedBusiness
            };
            await environmentController.create(args, adminUser, environmentModelMock, encryption_service_mock, businessModelMock);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.BUSINESS_NOT_APPROVED) {
                    expect(true).toBe(true);
                } else {
                    console.log("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.log("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    })

    it("should create the environment", async () => {
        try {
            const args: CreateEnvironmentType = {
                type: non_existing_environment,
                businessID: business
            };

            const environmentDetails = await environmentController.create(args, adminUser, environmentModelMock, encryption_service_mock, businessModelMock);

            expect(environmentModelMock.createKeys).toHaveBeenCalled();
            expect(encryption_service_mock.encrypt).toHaveBeenCalledWith(private_key)
            expect(encryption_service_mock.hash).toHaveBeenCalledWith(private_key);
            expect(environmentModelMock.storeEnvironment).toHaveBeenCalledWith({
                type: args.type,
                public_key: public_key,
                encrypted_private_key: encrypted_private_key,
                hashed_private_key: hashed_private_key,
                business_id: business
            });
            expect(environmentDetails).toEqual({
                environment_id: created_environment_id,
                public_key,
                type: args.type,
                private_key
            });
        } catch (err) {
            console.error(err);
            expect(false).toBe(true);
        }
    })
})

describe("Environment Controller: Rotate Key Tests", () => {
    const business = "existing id";
    const adminUser = "admin";
    const nonAdminUser = "non admin";
    const non_existing_environment = ENVIRONMENT_TYPES.LIVE;
    const existing_environment = ENVIRONMENT_TYPES.TEST;
    const old_public_key = "old_publick";
    const old_encrypted_private_key = "old_encrypted_private";
    const public_key = "publick";
    const private_key = "private";
    const encrypted_private_key = "encrypted_private";
    const hashed_private_key = "hashed_private";

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
                        res({ public_key: old_public_key, encrypted_private_key: old_encrypted_private_key })
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
            });

            encryption_service_mock.hash = jest.fn().mockImplementation((text: string) => {
                if (text !== private_key) {
                    throw new Error("Invalid arguement");
                }

                return hashed_private_key;
            })

            businessModelMock.isUserOwnerOrAdmin = jest.fn().mockImplementation((business_id: string, user_id: string) => {
                return new Promise((res, rej) => {
                    if (user_id === adminUser && business_id === business) {
                        res(true);
                    } else {
                        res(false);
                    }
                })
            })
        } catch (err) {
            console.error("Error setting up mocks");
        }
    });

    it("should fail if business does not have the environment", async () => {
        try {
            await environmentController.rotateKeys(business, adminUser, non_existing_environment, environmentModelMock, encryption_service_mock, businessModelMock);
            expect(false).toBe(true);
        } catch (err) {
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

    it("should fail if user calling is not admin or owner", async () => {
        try {
            await environmentController.rotateKeys(business, nonAdminUser, existing_environment, environmentModelMock, encryption_service_mock, businessModelMock);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.UNAUTHORIZED) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true)
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should create the new key", async () => {
        try {
            const newKeys = await environmentController.rotateKeys(business, adminUser, existing_environment, environmentModelMock, encryption_service_mock, businessModelMock);

            // Test that new keys were created
            expect(environmentModelMock.createKeys).toHaveBeenCalled();
            // Test that new keys were encrypted
            expect(encryption_service_mock.encrypt).toHaveBeenCalledWith(private_key);
            // Test that the key is hashed
            expect(encryption_service_mock.hash).toHaveBeenCalledWith(private_key);
            // Test that new keys were stored and the old one added a validUntil Date
            expect(environmentModelMock.rotateKey).toHaveBeenCalledWith(business, existing_environment, public_key, encrypted_private_key, old_public_key, hashed_private_key)
            expect(newKeys).toEqual({
                public_key,
                private_key
            })
        } catch (err) {
            console.error("Unexpected error", err);
            expect(false).toBe(true)
        }
    })
})