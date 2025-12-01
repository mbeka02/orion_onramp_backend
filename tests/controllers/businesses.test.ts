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

  describe("List Invitations", () => {
    it("allows owner/admin to list invitations", async () => {
      const mockInvitations = [
        {
          id: "invite-1",
          businessId: businessId,
          invitedBy: ownerId,
          email: "user1@example.com",
          role: "Developer",
          status: "Pending",
          createdAt: new Date(),
        },
        {
          id: "invite-2",
          businessId: businessId,
          invitedBy: ownerId,
          email: "user2@example.com",
          role: "Finance",
          status: "Pending",
          createdAt: new Date(),
        },
      ];

      (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(
        true,
      );
      (
        businessModelMock.listInvitationsForBusiness as jest.Mock
      ).mockResolvedValue(mockInvitations);

      const result = await businessController.listInvitations(
        businessId,
        ownerId,
        businessModelMock as any,
      );

      expect(businessModelMock.isUserOwnerOrAdmin).toHaveBeenCalledWith(
        businessId,
        ownerId,
      );
      expect(businessModelMock.listInvitationsForBusiness).toHaveBeenCalledWith(
        businessId,
      );
      expect(result).toEqual(mockInvitations);
    });

    it("blocks non-admin from listing invitations", async () => {
      (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(
        false,
      );

      await expect(
        businessController.listInvitations(
          businessId,
          otherUser,
          businessModelMock as any,
        ),
      ).rejects.toThrow(MyError);

      expect(businessModelMock.isUserOwnerOrAdmin).toHaveBeenCalledWith(
        businessId,
        otherUser,
      );
      expect(
        businessModelMock.listInvitationsForBusiness,
      ).not.toHaveBeenCalled();
    });
  });

  describe("Cancel Invitation", () => {
    const inviteId = "invite-id-123";

    it("allows owner/admin to cancel invitation", async () => {
      const mockInvitation = {
        id: inviteId,
        businessId: businessId,
        invitedBy: ownerId,
        email: "user@example.com",
        role: "Developer",
        status: "Pending",
        createdAt: new Date(),
      };

      (businessModelMock.getInvitationById as jest.Mock).mockResolvedValue(
        mockInvitation,
      );
      (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(
        true,
      );
      (businessModelMock.cancelInvitation as jest.Mock).mockResolvedValue(
        undefined,
      );

      await businessController.cancelInvitation(
        inviteId,
        ownerId,
        businessModelMock as any,
      );

      expect(businessModelMock.getInvitationById).toHaveBeenCalledWith(
        inviteId,
      );
      expect(businessModelMock.isUserOwnerOrAdmin).toHaveBeenCalledWith(
        businessId,
        ownerId,
      );
      expect(businessModelMock.cancelInvitation).toHaveBeenCalledWith(
        inviteId,
        ownerId,
      );
    });

    it("blocks non-admin from cancelling invitation", async () => {
      const mockInvitation = {
        id: inviteId,
        businessId: businessId,
        invitedBy: ownerId,
        email: "user@example.com",
        role: "Developer",
        status: "Pending",
        createdAt: new Date(),
      };

      (businessModelMock.getInvitationById as jest.Mock).mockResolvedValue(
        mockInvitation,
      );
      (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(
        false,
      );

      await expect(
        businessController.cancelInvitation(
          inviteId,
          otherUser,
          businessModelMock as any,
        ),
      ).rejects.toThrow(MyError);

      expect(businessModelMock.cancelInvitation).not.toHaveBeenCalled();
    });

    it("throws error when invitation not found", async () => {
      (businessModelMock.getInvitationById as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        businessController.cancelInvitation(
          inviteId,
          ownerId,
          businessModelMock as any,
        ),
      ).rejects.toThrow(MyError);

      expect(businessModelMock.isUserOwnerOrAdmin).not.toHaveBeenCalled();
      expect(businessModelMock.cancelInvitation).not.toHaveBeenCalled();
    });
  });

  describe("Get Team Members", () => {
    it("allows business member to view team", async () => {
      const mockMembers = [
        {
          id: "member-1",
          name: "John Doe",
          email: "john@example.com",
          role: "Admin",
          joinedAt: new Date(),
        },
        {
          id: "member-2",
          name: "Jane Smith",
          email: "jane@example.com",
          role: "Developer",
          joinedAt: new Date(),
        },
      ];

      (
        businessModelMock.checkUserBusinessMembership as jest.Mock
      ).mockResolvedValue(true);
      (businessModelMock.getBusinessTeamMembers as jest.Mock).mockResolvedValue(
        mockMembers,
      );

      const result = await businessController.getTeamMembers(
        businessId,
        ownerId,
        businessModelMock as any,
      );

      expect(
        businessModelMock.checkUserBusinessMembership,
      ).toHaveBeenCalledWith(ownerId, businessId);
      expect(businessModelMock.getBusinessTeamMembers).toHaveBeenCalledWith(
        businessId,
      );
      expect(result).toEqual(mockMembers);
    });

    it("blocks non-member from viewing team", async () => {
      (
        businessModelMock.checkUserBusinessMembership as jest.Mock
      ).mockResolvedValue(false);

      await expect(
        businessController.getTeamMembers(
          businessId,
          otherUser,
          businessModelMock as any,
        ),
      ).rejects.toThrow(MyError);

      expect(
        businessModelMock.checkUserBusinessMembership,
      ).toHaveBeenCalledWith(otherUser, businessId);
      expect(businessModelMock.getBusinessTeamMembers).not.toHaveBeenCalled();
    });
  });

  describe("Remove Team Member", () => {
    const memberId = "member-id-123";

    it("allows owner/admin to remove team member", async () => {
      (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(
        true,
      );
      (businessModelMock.removeTeamMember as jest.Mock).mockResolvedValue(
        undefined,
      );

      await businessController.removeTeamMember(
        businessId,
        memberId,
        ownerId,
        businessModelMock as any,
      );

      expect(businessModelMock.isUserOwnerOrAdmin).toHaveBeenCalledWith(
        businessId,
        ownerId,
      );
      expect(businessModelMock.removeTeamMember).toHaveBeenCalledWith(
        businessId,
        memberId,
        ownerId,
      );
    });

    it("blocks non-admin from removing team member", async () => {
      (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(
        false,
      );

      await expect(
        businessController.removeTeamMember(
          businessId,
          memberId,
          otherUser,
          businessModelMock as any,
        ),
      ).rejects.toThrow(MyError);

      expect(businessModelMock.isUserOwnerOrAdmin).toHaveBeenCalledWith(
        businessId,
        otherUser,
      );
      expect(businessModelMock.removeTeamMember).not.toHaveBeenCalled();
    });

    it("propagates model errors correctly", async () => {
      const errorMessage = "Cannot remove business owner from team";

      (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(
        true,
      );
      (businessModelMock.removeTeamMember as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      await expect(
        businessController.removeTeamMember(
          businessId,
          memberId,
          ownerId,
          businessModelMock as any,
        ),
      ).rejects.toThrow();

      expect(businessModelMock.removeTeamMember).toHaveBeenCalledWith(
        businessId,
        memberId,
        ownerId,
      );
    });
  });
});
