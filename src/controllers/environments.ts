import logger from "../lib/logger";
import { EnvironmentModel } from "../models/environments";
import { CreateEnvironmentType } from "../types/environments";
import { Errors, MyError } from "../errors";

export class EnvironmentsController {
    async create(args: CreateEnvironmentType, business_id: string, environmentModel: EnvironmentModel) {
        try {
            const doesBusinessAlreadyHaveEnvironment = await environmentModel.doesBusinessAlreadyHaveEnvironment(business_id, args.type);
            if (doesBusinessAlreadyHaveEnvironment === true) {
                throw new MyError(Errors.BUSINESS_ALREADY_HAS_ENVIRONMENT);
            }

            // Create keys for environment
            const {public_key, private_key} = environmentModel.createKeys();

            // Store environment
            const environment_id = await environmentModel.storeEnvironment({
                type: args.type,
                private_key,
                public_key,
                business_id
            });
            return environment_id;
        } catch(err) {
            if (err instanceof MyError) {
                throw err;
            }

            logger.error("Environment Controller: Error creating controller", {error: err, args});
            throw new Error("Could not create environment");
        }
    }
}

const environmentController = new EnvironmentsController();
export default environmentController;