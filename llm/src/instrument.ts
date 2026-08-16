import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { env } from "@/config/enviroments";

if (env.isProduction && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],

    //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,

    // Performance Monitoring
    tracesSampleRate: 1.0,
  });
  console.log("Sentry initialized successfully");
} else if (!env.isProduction) {
  console.info("Sentry disabled outside production");
} else {
  console.warn("SENTRY_DSN not found. Sentry will not be initialized.");
}
