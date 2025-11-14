import logger from "../lib/logger";
import { BusinessModel } from "../models/businesses";
import { CreateBusinessType, UpdateBusinessType, SubmitBusinessType, InviteUserType } from "../types/businesses";
import { Errors, MyError } from "../errors";

export class BusinessController {
    async createDraft(args: CreateBusinessType, ownerId: string, model: BusinessModel) {
        try {
            const id = await model.createDraft(args, ownerId);
            return { business_id: id };
        } catch (err) {
            if (err instanceof MyError) throw err;
            logger.error("Business Controller: Error creating draft", { err, args, ownerId });
            throw new Error(Errors.BUSINESS_CREATION_FAILED);
        }
    }

    async updateBusiness(businessId: string, updates: UpdateBusinessType | CreateBusinessType, actorId: string, model: BusinessModel) {
        try {
            // Authorization: only owner or ADMIN may update
            const allowed = await model.isUserOwnerOrAdmin(businessId, actorId);
            if (!allowed) throw new MyError(Errors.UNAUTHORIZED);

            await model.updateBusiness(businessId, updates, actorId);
        } catch (err) {
            if (err instanceof MyError) throw err;
            logger.error("Business Controller: Error updating business", { err, businessId, updates, actorId });
            throw new Error(Errors.INVALID_BUSINESS_DATA);
        }
    }

    async submitForApproval(businessId: string, actorId: string, model: BusinessModel) {
        try {
            const business = await model.getBusinessById(businessId);
            if (!business) throw new MyError(Errors.BUSINESS_NOT_FOUND);
            const allowed = await model.isUserOwnerOrAdmin(businessId, actorId);
            if (!allowed) throw new MyError(Errors.UNAUTHORIZED);
            if (business.businessRegistrationNumber) {
                const taken = await model.isRegistrationNumberTaken(businessId, business.businessRegistrationNumber);
                if (taken) throw new MyError(Errors.REGISTRATION_NUMBER_TAKEN);
            }

            await model.submitForApproval(businessId, actorId);
        } catch (err) {
            if (err instanceof MyError) throw err;
            logger.error("Business Controller: Error submitting for approval", { err, businessId, actorId });
            throw new Error(Errors.INVALID_BUSINESS_DATA);
        }
    }

    async getAllUserBusinesses(userId: string, model: BusinessModel) {
        try {
            const businesses = await model.getBusinessesForUser(userId);
            return businesses;
        } catch (err) {
            logger.error("Business Controller: Error getting businesses", { err, userId });
            throw new Error(Errors.INTERNAL_SERVER_ERROR);
        }
    }

    async getBusinessById(businessId: string, model: BusinessModel) {
        try {
            const business = await model.getBusinessById(businessId);
            if (!business) throw new MyError(Errors.BUSINESS_NOT_FOUND);
            return business;
        } catch (err) {
            if (err instanceof MyError) throw err;
            logger.error("Business Controller: Error getting business", { err, businessId });
            throw new Error(Errors.INTERNAL_SERVER_ERROR);
        }
    }

    async deleteBusiness(businessId: string, actorId: string, model: BusinessModel) {
        try {
            const allowed = await model.isUserOwnerOrAdmin(businessId, actorId);
            if (!allowed) throw new MyError(Errors.UNAUTHORIZED);

            await model.deleteBusiness(businessId, actorId);
        } catch (err) {
            if (err instanceof MyError) throw err;
            logger.error("Business Controller: Error deleting business", { err, businessId, actorId });
            throw new Error(Errors.INTERNAL_SERVER_ERROR);
        }
    }

    async inviteUser(businessId: string, invitedBy: string, args: InviteUserType, model: BusinessModel) {
        try {
            // Only owner or admin can invite
            const allowed = await model.isUserOwnerOrAdmin(businessId, invitedBy);
            if (!allowed) throw new MyError(Errors.UNAUTHORIZED);

            const inviteId = await model.inviteUser(businessId, invitedBy, args.email, args.role as unknown as string);
            return { invite_id: inviteId };
        } catch (err) {
            logger.error("Business Controller: Error inviting user", { err, businessId, invitedBy, args });
            // Some test setups can cause instanceof checks to fail across module boundaries.
            if (err instanceof MyError || (err && (err as any).name === "MyError")) throw err;
            throw new Error(Errors.INVITATION_FAILED);
        }
    }

    async acceptInvitation(invitationId: string, userId: string, userEmail: string, model: BusinessModel) {
        try {
            await model.acceptInvitation(invitationId, userId, userEmail);
        } catch (err) {
            logger.error("Business Controller: Error accepting invitation", { err, invitationId, userId });
            throw new Error(Errors.INTERNAL_SERVER_ERROR);
        }
    }
}

const businessController = new BusinessController();
export default businessController;
