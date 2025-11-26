import "dotenv/config";
import { PostHog } from "posthog-node";

export enum PostHogEventTypes {
  WARNING = "warning-orion-onramp",
  ERROR = "error-orion-onramp",
}

class Logger {
  private client: PostHog;

  constructor() {
    if (
      !process.env.POSTHOG_SECRET ||
      !process.env.POSTHOG_URL ||
      !process.env.POSTHOG_DISTINCT_ID ||
      !process.env.NODE_ENV
    ) {
      console.log(
        "Set POSTHOG_SECRET, NODE_ENV, POSTHOG_URL and POSTHOG_SECRET in env variables",
      );
      throw new Error(
        "Set POSTHOG_SECRET, NODE_ENV, POSTHOG_URL and POSTHOG_SECRET in env variables",
      );
    }

    this.client = new PostHog(process.env.POSTHOG_SECRET, {
      host: process.env.POSTHOG_URL,
    });
  }

  private serializeError(err: any): any {
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }

    return err;
  }

  async sendEvent(
    event_type: PostHogEventTypes,
    description: string,
    details: any,
  ) {
    if (process.env.NODE_ENV !== "development") {
      try {
        this.client.capture({
          distinctId: process.env.POSTHOG_DISTINCT_ID,
          event: event_type,
          properties: {
            app: "Orion Onramp",
            description,
            details: this.serializeError(details),
          },
        });

        await this.client.shutdown();
      } catch (err) {
        console.log("Could not send event", err);
      }
    }
  }
}

const postHogLogger = new Logger();
export default postHogLogger;
