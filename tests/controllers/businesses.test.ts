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

    const res = await businessController.createDraft(
      {},
      ownerId,
      businessModelMock as any,
    );
    expect(businessModelMock.createDraft).toHaveBeenCalled();
    expect(res.business_id).toBe(businessId);
  });

  it("blocks update when not owner/admin", async () => {
    const testName = "blocks update when not owner/admin";

    (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(
      false,
    );

    await expect(
      businessController.updateBusiness(
        businessId,
        {
          id: "",
        },
        otherUser,
        businessModelMock as any,
      ),
    ).rejects.toThrow(MyError);
  });

  it("allows update when owner/admin", async () => {
    const testName = "allows update when owner/admin";

    (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(true);
    (businessModelMock.updateBusiness as jest.Mock).mockResolvedValue(
      undefined,
    );

    // ensure the business exists
    (businessModelMock.getBusinessById as jest.Mock).mockResolvedValue({
      id: businessId,
    });

    await businessController.updateBusiness(
      businessId,
      {
        id: "",
      },
      ownerId,
      businessModelMock as any,
    );
    expect(businessModelMock.updateBusiness).toHaveBeenCalledWith(businessId, {
      id: "",
    });
  });

  it("rejects submit when registration number taken", async () => {
    const testName = "rejects submit when registration number taken";

    (businessModelMock.getBusinessById as jest.Mock).mockResolvedValue({
      id: businessId,
      businessRegistrationNumber: "RN-1",
    });
    (
      businessModelMock.isRegistrationNumberTaken as jest.Mock
    ).mockResolvedValue(true);

    await expect(
      businessController.submitForApproval(
        businessId,
        ownerId,
        businessModelMock as any,
      ),
    ).rejects.toThrow(MyError);
  });
  it("blocks invite when not owner/admin", async () => {
    (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(
      false,
    );
    await expect(
      businessController.inviteUser(
        businessId,
        ownerId,
        { email: "a@b.com", role: "Admin" } as any,
        businessModelMock as any,
      ),
    ).rejects.toThrow(MyError);
  });
  it("invites user only when owner/admin", async () => {
    (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(true);
    (businessModelMock.inviteUser as jest.Mock).mockResolvedValue("invite-id");
    const res = await businessController.inviteUser(
      businessId,
      ownerId,
      { email: "a@b.com", role: "Admin" } as any,
      businessModelMock as any,
    );
    expect(res.invite_id).toBe("invite-id");
  });

  it("accepts invitation", async () => {
    const testName = "accepts invitation";
    (businessModelMock.acceptInvitation as jest.Mock).mockResolvedValue(
      undefined,
    );
    await businessController.acceptInvitation(
      "invite-id",
      otherUser,
      "guest@example.com",
      businessModelMock as any,
    );
    expect(businessModelMock.acceptInvitation).toHaveBeenCalledWith(
      "invite-id",
      otherUser,
      "guest@example.com",
    );
  });
  it("gets industries and categories", async () => {
    const mockIndustries = [
      {
        id: "1",
        name: "Industry 1",
        categories: [{ id: "1.1", name: "Category 1" }],
      },
      {
        id: "2",
        name: "Industry 2",
        categories: [{ id: "2.1", name: "Category 2" }],
      },
    ];
    (
      businessModelMock.getIndustriesAndCategories as jest.Mock
    ).mockResolvedValue(mockIndustries);
    const res = await businessController.getIndustriesAndCategories(
      businessModelMock as any,
    );
    expect(res).toEqual(mockIndustries);
  });
});
