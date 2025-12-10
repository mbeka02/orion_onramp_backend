import e from "express";
import environmentController from "../../src/controllers/environments";
import { Errors, MyError } from "../../src/errors";
import {
  CreateEnvironmentType,
  ENVIRONMENT_TYPES,
} from "../../src/types/environments";
import businessModelMock from "../mocks/business_model_mock";
import { encryption_service_mock } from "../mocks/encryption_mock";
import { environmentModelMock } from "../mocks/environment_model_mock";

describe("Environment Controller: Create Key Tests", () => {
  const business = "existing id";
  const failingBusinessID = "failing id";
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
  const webhook_secret = "webhook_secert";
  const encrypted_webhook_secret = "encrypted_webhook_secret";

  beforeAll(async () => {
    try {
      businessModelMock.isBusinessApproved = jest
        .fn()
        .mockImplementation((business_id) => {
          return new Promise((res, rej) => {
            if (business_id === unapprovedBusiness) {
              res(false);
            } else if (business_id === business) {
              res(true);
            } else {
              rej(new Error("Unexpected input"));
            }
          });
        });

      environmentModelMock.doesBusinessAlreadyHaveEnvironment = jest
        .fn()
        .mockImplementation(
          (business_id: string, environment_type: ENVIRONMENT_TYPES) => {
            return new Promise((res, rej) => {
              if (
                business_id === business &&
                environment_type === non_existing_environment
              ) {
                res(false);
              } else if (
                business_id === business &&
                environment_type === existing_environment
              ) {
                res(true);
              } else {
                rej("Invalid arguments");
              }
            });
          },
        );

      environmentModelMock.storeEnvironment = jest
        .fn()
        .mockImplementation((environment) => {
          return new Promise((res, rej) => {
            res(created_environment_id);
          });
        });

      environmentModelMock.createKeys = jest.fn().mockImplementation(() => {
        return {
          public_key: public_key,
          private_key: private_key,
          webhook_secret,
        };
      });

      encryption_service_mock.encrypt = jest.fn().mockImplementation((text) => {
        if (text === private_key) {
          return encrypted_private_key;
        } else if (text === webhook_secret) {
          return encrypted_webhook_secret;
        } else {
          throw new Error("Invalid arguement");
        }
      });

      encryption_service_mock.hash = jest
        .fn()
        .mockImplementation((text: string) => {
          if (text !== private_key) {
            throw new Error("Invalid arguement");
          }

          return hashed_private_key;
        });

      businessModelMock.isUserOwnerOrAdmin = jest
        .fn()
        .mockImplementation((business_id: string, user_id: string) => {
          return new Promise((res, rej) => {
            if (
              user_id === adminUser &&
              (business_id === business || business_id === unapprovedBusiness)
            ) {
              res(true);
            } else {
              res(false);
            }
          });
        });
    } catch (err) {
      console.error("Error setting up mocks");
    }
  });

  it("should fail if business already has an environment of the same type", async () => {
    try {
      const args: CreateEnvironmentType = {
        type: existing_environment,
        businessID: business,
      };
      await environmentController.create(
        args,
        adminUser,
        environmentModelMock,
        encryption_service_mock,
        businessModelMock,
      );
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
        businessID: business,
      };
      await environmentController.create(
        args,
        nonAdminUser,
        environmentModelMock,
        encryption_service_mock,
        businessModelMock,
      );
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
        businessID: unapprovedBusiness,
      };
      await environmentController.create(
        args,
        adminUser,
        environmentModelMock,
        encryption_service_mock,
        businessModelMock,
      );
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
  });

  it("should create the environment", async () => {
    try {
      const args: CreateEnvironmentType = {
        type: non_existing_environment,
        businessID: business,
      };

      const environmentDetails = await environmentController.create(
        args,
        adminUser,
        environmentModelMock,
        encryption_service_mock,
        businessModelMock,
      );

      expect(environmentModelMock.createKeys).toHaveBeenCalled();
      expect(encryption_service_mock.encrypt).toHaveBeenCalledWith(private_key);
      expect(encryption_service_mock.hash).toHaveBeenCalledWith(private_key);
      expect(environmentModelMock.storeEnvironment).toHaveBeenCalledWith({
        type: args.type,
        public_key: public_key,
        encrypted_private_key: encrypted_private_key,
        hashed_private_key: hashed_private_key,
        business_id: business,
        encrypted_webhook_secret,
      });
      expect(environmentDetails).toEqual({
        environment_id: created_environment_id,
        public_key,
        type: args.type,
        private_key,
      });
    } catch (err) {
      console.error(err);
      expect(false).toBe(true);
    }
  });
});

describe("Environment Controller: Rotate Key Tests", () => {
  const business = "existing id";
  const issueGettingDetailsBusiness = "issue getting details business id";
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
      environmentModelMock.doesBusinessAlreadyHaveEnvironment = jest
        .fn()
        .mockImplementation(
          (business_id: string, environment_type: ENVIRONMENT_TYPES) => {
            return new Promise((res, rej) => {
              if (
                (business_id === business || business_id === issueGettingDetailsBusiness) &&
                environment_type === non_existing_environment
              ) {
                res(false);
              } else if (
                (business_id === business || business_id === issueGettingDetailsBusiness) &&
                environment_type === existing_environment
              ) {
                res(true);
              } else {
                rej("Invalid arguments");
              }
            });
          },
        );

      environmentModelMock.rotateKey = jest.fn().mockImplementation(() => {
        return new Promise((res, rej) => {
          res(null);
        });
      });

      environmentModelMock.getLatestValidBusinessEnvironmentKeys = jest
        .fn()
        .mockImplementation(
          (business_id: string, environment_type: ENVIRONMENT_TYPES) => {
            return new Promise((res, rej) => {
              if (
                business_id === business &&
                environment_type === existing_environment
              ) {
                res({
                  public_key: old_public_key,
                  encrypted_private_key: old_encrypted_private_key,
                });
              } else {
                res(null);
              }
            });
          },
        );

      environmentModelMock.createKeys = jest.fn().mockImplementation(() => {
        return { public_key: public_key, private_key: private_key };
      });

      encryption_service_mock.encrypt = jest.fn().mockImplementation((text) => {
        if (text !== private_key) {
          throw new Error("Invalid arguement");
        }

        return encrypted_private_key;
      });

      encryption_service_mock.hash = jest
        .fn()
        .mockImplementation((text: string) => {
          if (text !== private_key) {
            throw new Error("Invalid arguement");
          }

          return hashed_private_key;
        });

      businessModelMock.isUserOwnerOrAdmin = jest
        .fn()
        .mockImplementation((business_id: string, user_id: string) => {
          return new Promise((res, rej) => {
            if (user_id === adminUser && (business_id === business || business_id === issueGettingDetailsBusiness)) {
              res(true);
            } else {
              res(false);
            }
          });
        });
    } catch (err) {
      console.error("Error setting up mocks");
    }
  });

  it("should fail if business does not have the environment", async () => {
    try {
      await environmentController.rotateKeys(
        business,
        adminUser,
        non_existing_environment,
        environmentModelMock,
        encryption_service_mock,
        businessModelMock,
      );
      expect(false).toBe(true);
    } catch (err) {
      if (err instanceof MyError) {
        if (err.message === Errors.BUSINESS_DOES_NOT_HAVE_ENVIRONMENT) {
          expect(true).toBe(true);
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

  it("should fail if old keys for business couldn't be gotten", async () => {
    try {
      await environmentController.rotateKeys(
        issueGettingDetailsBusiness,
        adminUser,
        existing_environment,
        environmentModelMock,
        encryption_service_mock,
        businessModelMock,
      );
      expect(false).toBe(true);
    } catch(err) {
      if (err instanceof MyError) {
        if (err.message === Errors.BUSINESS_DOES_NOT_HAVE_KEYS) {
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
  })

  it("should fail if user calling is not admin or owner", async () => {
    try {
      await environmentController.rotateKeys(
        business,
        nonAdminUser,
        existing_environment,
        environmentModelMock,
        encryption_service_mock,
        businessModelMock,
      );
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

  it("should create the new key", async () => {
    try {
      const newKeys = await environmentController.rotateKeys(
        business,
        adminUser,
        existing_environment,
        environmentModelMock,
        encryption_service_mock,
        businessModelMock,
      );

      // Test that new keys were created
      expect(environmentModelMock.createKeys).toHaveBeenCalled();
      // Test that new keys were encrypted
      expect(encryption_service_mock.encrypt).toHaveBeenCalledWith(private_key);
      // Test that the key is hashed
      expect(encryption_service_mock.hash).toHaveBeenCalledWith(private_key);
      // Test that new keys were stored and the old one added a validUntil Date
      expect(environmentModelMock.rotateKey).toHaveBeenCalledWith(
        business,
        existing_environment,
        public_key,
        encrypted_private_key,
        old_public_key,
        hashed_private_key,
      );
      expect(newKeys).toEqual({
        public_key,
        private_key,
      });
    } catch (err) {
      console.error("Unexpected error", err);
      expect(false).toBe(true);
    }
  });
});

describe("Environment Controller: Get All Business environments tests", () => {
  const businessID = "business ID";
  const adminUserID = "admin user";
  const nonAdminUserID = "non admin user";
  const environments = [
    {
      id: "environment id",
      type: ENVIRONMENT_TYPES.TEST,
      public_key: "a public key",
      private_key_preview: "a private key preview",
      created_at: new Date()
    }
  ]
  
  beforeAll(async () => {
    businessModelMock.isUserOwnerOrAdmin = jest.fn().mockImplementation((business_id, user_id) => {
      return new Promise((res, rej) => {
        if (business_id === businessID && user_id === adminUserID) {
          res(true);
        } else if (business_id === businessID && user_id === nonAdminUserID) {
          res(false);
        } else {
          rej("Unexpected input");
        }
      })
    });

    environmentModelMock.getBusinessEnvironments = jest.fn().mockImplementation((business_id) => {
      return new Promise((res, rej) => {
        if (business_id === businessID) {
          res(environments)
        } else {
          rej("Unexpected business id");
        }
      })
    })
  })

  it("should fail if user is not owner or admin of business", async () => {
    try {
      await environmentController.getAllBusinessEnvironments(
        businessID,
        nonAdminUserID,
        environmentModelMock,
        businessModelMock
      );
      expect(false).toBe(true);
    } catch(err) {
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

  it ("should return business environments", async () => {
    const envs = await environmentController.getAllBusinessEnvironments(
      businessID,
      adminUserID,
      environmentModelMock,
      businessModelMock
    );

    expect(envs).toEqual(environments);
  })
});

describe("Environments Controller: Get Webhook Config", () => {
  const nonExistingEnvironmentID = "non existing environment id";
  const existingEnvironmentID = "existing environment id";
  const notGetDetailsEnvironment = "not get details environment id";
  const notGetDetailsBusiness = "not get details business id";
  const nonAdminUser = "non admin user id";
  const adminUser = "admin user id";
  const business_id = "business id";
  const webhookURL = "webhook url";
  const webhookSecret = "webhook secret";

  beforeAll(async () => {
    environmentModelMock.getEnvironmentById = jest.fn().mockImplementation((environment_id) => {
      return new Promise((res, rej) => {
        if (environment_id === nonExistingEnvironmentID) {
          res(null);
        } else if (environment_id === existingEnvironmentID) {
          res({
            business_id: business_id,
            webhook_url: webhookURL
          })
        } else if (environment_id == notGetDetailsEnvironment) {
          res({
            business_id: notGetDetailsBusiness,
            webhook_url: webhookURL
          })
        } else {
          rej("Unexpected input");
        }
      })
    });

    businessModelMock.isUserOwnerOrAdmin = jest.fn().mockImplementation((businessID, userID) => {
      return new Promise((res, rej) => {
        if ((businessID === business_id || businessID === notGetDetailsBusiness) && userID === nonAdminUser) {
          res(false);
        } else if ((businessID === business_id || businessID === notGetDetailsBusiness) && userID === adminUser) {
          res(true);
        } else {
          rej("Unexpected input");
        }
      })
    });

    environmentModelMock.getEnvironmentWebhookDetails = jest.fn().mockImplementation((enviornment_id, _) => {
      return new Promise((res, rej) => {
        if (enviornment_id === notGetDetailsEnvironment) {
          res(null);
        } else if (enviornment_id === existingEnvironmentID) {
          res({
            webhook_secret: webhookSecret
          })
        } else {
          rej("Unexpected input");
        }
      })
    })
  })

  it("should fail if environment does not exist", async () => {
    try {
      await environmentController.getWebhookConfig(
        nonExistingEnvironmentID,
        adminUser,
        environmentModelMock,
        encryption_service_mock,
        businessModelMock
      );
      expect(false).toBe(true);
    } catch(err) {
      if (err instanceof MyError) {
        if (err.message === Errors.ENVIRONMENT_NOT_FOUND) {
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

  it("should fail if user is not admin or owner of business", async () => {
    try {
      await environmentController.getWebhookConfig(
        existingEnvironmentID,
        nonAdminUser,
        environmentModelMock,
        encryption_service_mock,
        businessModelMock
      );
      expect(false).toBe(true);
    } catch(err) {
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

  it("should throw error if it couldn't get webhook config", async () => {
    try {
      await environmentController.getWebhookConfig(
        notGetDetailsEnvironment,
        adminUser,
        environmentModelMock,
        encryption_service_mock,
        businessModelMock
      );
      expect(false).toBe(true);
    } catch(err) {
      if (err instanceof MyError) {
        if (err.message === Errors.NOT_GET_WEBHOOK_CONFIG) {
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

  it("should return webhook config", async () => {
    const webhookDetails = await environmentController.getWebhookConfig(
      existingEnvironmentID,
      adminUser,
      environmentModelMock,
      encryption_service_mock,
      businessModelMock
    );

    expect(webhookDetails).toEqual({
      webhookUrl: webhookURL,
      webhookSecret: webhookSecret
    })
  })
})