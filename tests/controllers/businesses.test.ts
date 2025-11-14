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
        const testName = "creates draft";

        (businessModelMock.createDraft as jest.Mock).mockResolvedValue(businessId);

        const res = await businessController.createDraft({}, ownerId, businessModelMock as any);
        expect(businessModelMock.createDraft).toHaveBeenCalled();
        expect(res.business_id).toBe(businessId);

    });

    it("blocks update when not owner/admin", async () => {
        const testName = "blocks update when not owner/admin";

        (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(false);

        await expect(businessController.updateBusiness(businessId, {
            id: ""
        }, otherUser, businessModelMock as any)).rejects.toThrow(MyError);

    });

    it("allows update when owner/admin", async () => {
        const testName = "allows update when owner/admin";

        (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(true);
        (businessModelMock.updateBusiness as jest.Mock).mockResolvedValue(undefined);

        // ensure the business exists
        (businessModelMock.getBusinessById as jest.Mock).mockResolvedValue({ id: businessId });

        await businessController.updateBusiness(businessId, {
            id: ""
        }, ownerId, businessModelMock as any);
        expect(businessModelMock.updateBusiness).toHaveBeenCalledWith(businessId, {
            id: ""
        }, ownerId);

    });

    it("rejects submit when registration number taken", async () => {
        const testName = "rejects submit when registration number taken";

        (businessModelMock.getBusinessById as jest.Mock).mockResolvedValue({ id: businessId, businessRegistrationNumber: "RN-1" });
        (businessModelMock.isRegistrationNumberTaken as jest.Mock).mockResolvedValue(true);

        await expect(businessController.submitForApproval(businessId, ownerId, businessModelMock as any)).rejects.toThrow(MyError);

    });

    it("invites user only when owner/admin", async () => {
        const testName = "invites user only when owner/admin";
        // Test the rejection path first
        (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(false);
        await expect(businessController.inviteUser(businessId, ownerId, { email: "a@b.com", role: "Admin" } as any, businessModelMock as any)).rejects.toThrow(MyError);

        // Reset mock and test the success path
        (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(true);
        (businessModelMock.inviteUser as jest.Mock).mockResolvedValue("invite-id");
        const res = await businessController.inviteUser(businessId, ownerId, { email: "a@b.com", role: "Admin" } as any, businessModelMock as any);
        expect(res.invite_id).toBe("invite-id");

    });

    it("accepts invitation", async () => {
        const testName = "accepts invitation";
        (businessModelMock.acceptInvitation as jest.Mock).mockResolvedValue(undefined);
        await businessController.acceptInvitation("invite-id", otherUser, "guest@example.com", businessModelMock as any);
        expect(businessModelMock.acceptInvitation).toHaveBeenCalledWith("invite-id", otherUser, "guest@example.com");

    });
});