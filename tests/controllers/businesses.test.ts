import businessController from "../../src/controllers/businesses";
import { Errors, MyError } from "../../src/errors";
import { businessModelMock } from "../mocks/business_model_mock";

describe("Business Controller", () => {
    const ownerId = "owner-id";
    const otherUser = "other-id";
    const businessId = "biz-id";

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it("creates draft", async () => {
        (businessModelMock.createDraft as jest.Mock).mockResolvedValue(businessId);

        const res = await businessController.createDraft({}, ownerId, businessModelMock as any);
        expect(businessModelMock.createDraft).toHaveBeenCalled();
        expect(res.business_id).toBe(businessId);
    });

    it("blocks update when not owner/admin", async () => {
        (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(false);

        await expect(businessController.updateBusiness(businessId, {}, otherUser, businessModelMock as any)).rejects.toThrow(MyError);
    });

    it("allows update when owner/admin", async () => {
        (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(true);
        (businessModelMock.updateBusiness as jest.Mock).mockResolvedValue(undefined);

        await businessController.updateBusiness(businessId, {}, ownerId, businessModelMock as any);
        expect(businessModelMock.updateBusiness).toHaveBeenCalledWith(businessId, {}, ownerId);
    });

    it("rejects submit when registration number taken", async () => {
        (businessModelMock.getBusinessById as jest.Mock).mockResolvedValue({ id: businessId, businessRegistrationNumber: "RN-1" });
        (businessModelMock.isRegistrationNumberTaken as jest.Mock).mockResolvedValue(true);

        await expect(businessController.submitForApproval(businessId, ownerId, businessModelMock as any)).rejects.toThrow(MyError);
    });

    it("invites user only when owner/admin", async () => {
        (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(false);
        await expect(businessController.inviteUser(businessId, ownerId, { email: "a@b.com", role: "Admin" } as any, businessModelMock as any)).rejects.toThrow(MyError);

        (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(true);
        (businessModelMock.inviteUser as jest.Mock).mockResolvedValue("invite-id");
        const res = await businessController.inviteUser(businessId, ownerId, { email: "a@b.com", role: "Admin" } as any, businessModelMock as any);
        expect(res.invite_id).toBe("invite-id");
    });

    it("accepts invitation", async () => {
        (businessModelMock.acceptInvitation as jest.Mock).mockResolvedValue(undefined);
        await businessController.acceptInvitation("invite-id", otherUser, "guest@example.com", businessModelMock as any);
        expect(businessModelMock.acceptInvitation).toHaveBeenCalledWith("invite-id", otherUser, "guest@example.com");
    });
});
