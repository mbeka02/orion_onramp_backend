declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: number,
            NODE_ENV: "development" | "production" | "test",
            LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace",
            DATABASE_URL: string
        }
    }
}

export {}