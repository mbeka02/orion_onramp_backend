jest.mock("../../src/lib/auth/utils", () => ({
    getAuthContext: jest.fn().mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } })
}));

import request from "supertest";
import businessModelMock from "../mocks/business_model_mock";

jest.mock("../../src/models/businesses", () => ({
    __esModule: true,
    default: require("../mocks/business_model_mock").default,
}));

// Import app after mocks are configured
const app = require("../../src/index").default;

describe("Business routes", () => {
    beforeEach(() => jest.resetAllMocks());

    it("creates draft via POST /api/businesses", async () => {
        (businessModelMock.createDraft as jest.Mock).mockResolvedValue("biz-1");

        const res = await request(app)
            .post("/api/businesses")
            .send({ tradingName: "Acme Ltd" });

        expect(res.status).toBe(201);
        expect(res.body.business.id).toBe("biz-1");
    });

    it("invites user via POST /api/businesses/:id/invite", async () => {
        (businessModelMock.isUserOwnerOrAdmin as jest.Mock).mockResolvedValue(true);
        (businessModelMock.inviteUser as jest.Mock).mockResolvedValue("invite-1");

        const res = await request(app)
            .post("/api/businesses/biz-1/invite")
            .send({ email: "friend@example.com", role: "Admin" });

        expect(res.status).toBe(201);
        expect(res.body.invite.invite_id).toBe("invite-1");
    });

    it("accepts invitation via POST /api/businesses/invitations/:inviteId/accept", async () => {
        (businessModelMock.acceptInvitation as jest.Mock).mockResolvedValue(undefined);

        const res = await request(app)
            .post("/api/businesses/invitations/invite-1/accept")
            .send();

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Invitation accepted");
    });
});
