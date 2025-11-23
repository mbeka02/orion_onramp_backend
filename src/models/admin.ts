import { db } from "../lib/db";
import { admin } from "../lib/db/schema";
import { CreateAdminInput, LoginAdminInput } from "../types/admin";
import { MyError, Errors } from "../errors";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
export class AdminModel {
    async createAdmin(args: CreateAdminInput) {
        try {
            const doesAdminExist = await this.doesAdminExist(args.email);
            if (doesAdminExist) {
                throw new MyError(Errors.ADMIN_ALREADY_EXISTS);
            }
            const newAdmin = await db.insert(admin).values({
                name: args.name,
                email: args.email,
                password: args.password,
            }).returning();

            return {email: newAdmin[0].email, id: newAdmin[0].id};
        }
        catch (error) {
            throw error;
        }
    }
    async login(args: LoginAdminInput) {
        try {
            const admin = await this.getAdminByEmail(args.email);
            if (!admin) {
                throw new MyError(Errors.WRONG_ADMIN_CREDENTIALS);
            }
            const isPasswordValid = bcrypt.compareSync(args.password, admin.password);
            if (!isPasswordValid) {
                throw new MyError(Errors.WRONG_ADMIN_CREDENTIALS);
            }
            return admin;
        }
        catch (error) {
            throw error;
        }
    }
    private async doesAdminExist(email: string) {
        try {
            const existingAdmin = await db.select().from(admin).where(eq(admin.email, email));
            return existingAdmin.length > 0;
        }
        catch (error) {
            throw error;
        }
    }
    async getAdminByEmail(email: string) {
        try {
            const adminRecord = await db.select().from(admin).where(eq(admin.email, email));
            return adminRecord[0];
        }
        catch (error) {
            throw error;
        }
    }
}