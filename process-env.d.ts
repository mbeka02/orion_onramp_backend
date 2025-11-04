declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: number,
            NODE_ENV: "development" | "production" | "test",
            LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace",
            DATABASE_URL: string,
            POSTHOG_SECRET: string,
            POSTHOG_URL: string,
            POSTHOG_DISTINCT_ID: string,
            FRONTEND_URL: string
        }
    }
}

export {}