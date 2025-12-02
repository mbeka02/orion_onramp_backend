import { WebhookController } from "../../src/controllers/webhook";

export const webhookControllerMock = {
    sendEvent: jest.fn()
} as WebhookController