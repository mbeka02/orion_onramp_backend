import { AdminModel } from "../models/admin";
import { CreateAdminInput, LoginAdminInput, JWTPayload } from "../types/admin";
import { MyError, Errors } from "../errors";
import logger from "../lib/logger";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const SALT_ROUNDS = 10;
export class Admincontroller {
    async createadmin(args: CreateAdminInput, model: AdminModel) {
        try {
            const hashPassword = this.hashPassword(args.password);
            const admin = await model.createAdmin({ ...args, password: hashPassword });
            const token = this.generateToken(admin.id, admin.email);
            return { admin, token };
        } catch (err) {
            if (err instanceof MyError)
                throw err;
            logger.error("Admin Controller: Error creating admin", { err, args });
            throw new Error(Errors.INTERNAL_SERVER_ERROR);
        }
    }
    async login(args: LoginAdminInput, model: AdminModel) {
        try {
            const admin = await model.login(args);
            const token = this.generateToken(admin.id, admin.email);
            return { admin, token };
        } catch (err) {
            if (err instanceof MyError)
                throw err;
            logger.error("Admin Controller: Error logging in admin", { err, args });
            throw new Error(Errors.INTERNAL_SERVER_ERROR);
        }
    }
    private hashPassword(password: string): string {
        const salt = bcrypt.genSaltSync(SALT_ROUNDS);
        return bcrypt.hashSync(password, salt);
    }
    private generateToken(adminId: string, email: string): string {
        const payload: JWTPayload = { adminId, email };
        const secretKey = process.env.JWT_SECRET_KEY as string;
        return jwt.sign(payload, secretKey, { expiresIn: "7d" });
    }
}