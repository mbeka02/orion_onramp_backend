declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: string,
            NODE_ENV: "development" | "production" | "test",
            LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace",
            DATABASE_URL: string,
            POSTHOG_SECRET: string,
            POSTHOG_URL: string,
            POSTHOG_DISTINCT_ID: string,
            EMAIL_FROM: string,
            EMAIL_SERVER_HOST: string,
            EMAIL_SERVER_PORT: string,
            EMAIL_SERVER_USER: string,
            EMAIL_SERVER_PASSWORD: string,
            FRONTEND_URL: string,
            SECRET_KEY: string
        }
    }
}

export {}