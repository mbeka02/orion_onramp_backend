import { WebhookModel } from "../../src/models/webhook";

export const webhookModelMock = {
    sendEvent: jest.fn(),
    generateSignature: jest.fn()
} as WebhookModel