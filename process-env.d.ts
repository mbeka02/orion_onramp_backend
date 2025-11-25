declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      NODE_ENV: "development" | "production" | "test";
      LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
      DATABASE_URL: string;
      POSTHOG_SECRET: string;
      POSTHOG_URL: string;
      POSTHOG_DISTINCT_ID: string;
      EMAIL_FROM: string;
      EMAIL_SERVER_HOST: string;
      EMAIL_SERVER_PORT: string;
      EMAIL_SERVER_USER: string;
      EMAIL_SERVER_PASSWORD: string;
      FRONTEND_URL: string;
      SECRET_KEY: string;
      PAYSTACK_TEST_SECRET_KEY: string;
      PAYSTACK_LIVE_SECRET_KEY: string;
      KESy_TESTNET_PRIVATE_KEY: string;
      KESy_TESTNET_KEY_ACCOUNT_ID: string;
      INFISICAL_PROJECT_ID: string;
      INFISICAL_CLIENT_ID: string;
      INFISICAL_CLIENT_SECRET: string;
      TREASURY_OVERLOOK_EMAIL: string;
      HEDERA_BACKEND_ACCOUNT_ID: string;
      HEDERA_BACKEND_PRIVATE_KEY: string;
      HEDERA_TESTNET_MIRROR_NODE_API: string;
      JWT_SECRET_KEY: string;
    }
  }
}

export {};
