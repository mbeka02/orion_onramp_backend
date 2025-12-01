import { BusinessModel } from "../../src/models/businesses";

export const businessModelMock: Partial<BusinessModel> = {
  createDraft: jest.fn(),
  updateBusiness: jest.fn(),
  submitForApproval: jest.fn(),
  getBusinessesForUser: jest.fn(),
  getBusinessById: jest.fn(),
  deleteBusiness: jest.fn(),
  inviteUser: jest.fn(),
  isUserOwnerOrAdmin: jest.fn(),
  getInvitationById: jest.fn(),
  acceptInvitation: jest.fn(),
  isRegistrationNumberTaken: jest.fn(),
  listInvitationsForBusiness: jest.fn(),
  getIndustriesAndCategories: jest.fn(),
  isBusinessApproved: jest.fn(),
  getBusinessesByStatus: jest.fn(),
  cancelInvitation: jest.fn(),
  getBusinessTeamMembers: jest.fn(),
  removeTeamMember: jest.fn(),
  checkUserBusinessMembership: jest.fn(),
};

export default businessModelMock as BusinessModel;
