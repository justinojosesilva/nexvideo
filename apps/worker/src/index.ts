import * as Sentry from "@sentry/node";
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import axios from "axios";
import { prisma } from "@nexvideo/database";
import * as http from "http";
import { logger } from "./logger";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const QUEUE_NAME = "nexvideo-jobs";
const API_URL = process.env.API_URL || "http://localhost:3002";

const REDACTED_PAYLOAD_KEYS = new Set(["scriptBlocks", "apiKey", "token", "password", "secret"]);

function redactJobPayload(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (REDACTED_PAYLOAD_KEYS.has(key)) return [key, "[REDACTED]"];
      if (typeof value === "string" && value.length > 200)
        return [key, `${value.slice(0, 200)}...[truncated]`];
      return [key, value];
    }),
  );
}

const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

const jobsQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: false,
  },
});

// Special handling for narration jobs with different retry policy
const narrationJobOptions = {
  attempts: 2, // Only 2 retries for narration
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: false,
};

async function processHealthCheckJob(job: Job): Promise<{ status: string }> {
  logger.info({ jobId: job.id }, "Processing health-check job");
  await job.updateProgress(50);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await job.updateProgress(100);
  logger.info({ jobId: job.id }, "Completed health-check job");
  return { status: "completed" };
}

async function processAnalyzeTrendsJob(job: Job): Promise<unknown> {
  const jobData = job.data as Record<string, unknown>;
  const { projectId, organizationId, keyword, geo, niche } = jobData;

  logger.info({ jobId: job.id, organizationId }, "Processing analyze-trends job");

  try {
    await job.updateProgress(10);
    const response = await axios.post(`${API_URL}/trends/internal/execute`, {
      projectId,
      organizationId,
      keyword,
      geo,
      niche,
    });
    await job.updateProgress(90);
    logger.info({ jobId: job.id, organizationId }, "Completed analyze-trends job");
    await job.updateProgress(100);
    return response.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ jobId: job.id, organizationId, err: errorMessage }, "Error calling trends API");
    throw error;
  }
}

async function processGenerateScriptJob(job: Job): Promise<unknown> {
  const jobData = job.data as Record<string, unknown>;
  const { projectId, organizationId, trendAnalysisId, formatType, tone, keyword } = jobData;

  logger.info({ jobId: job.id, organizationId }, "Processing generate-script job");

  try {
    await job.updateProgress(20);

    let promptVersion = "unknown";
    try {
      const versionsResponse = await axios.get(`${API_URL}/prompts/versions`);
      promptVersion = versionsResponse.data?.scripts || "unknown";
    } catch {
      // Silently fail if versions endpoint is not available
    }

    const response = await axios.post(`${API_URL}/scripts/internal/generate`, {
      projectId,
      organizationId,
      trendAnalysisId,
      formatType,
      tone,
      ...(keyword ? { keyword } : {}),
    });

    await job.updateProgress(80);

    const { script } = response.data;
    if (script?.estimatedCostBrl) {
      logger.info(
        { jobId: job.id, organizationId, estimatedCostBrl: script.estimatedCostBrl, promptVersion },
        "Script generated",
      );
    }

    await job.updateProgress(100);
    logger.info({ jobId: job.id, organizationId }, "Completed generate-script job");
    return response.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ jobId: job.id, organizationId, err: errorMessage }, "Error calling script generation API");
    throw error;
  }
}

async function processNarrationJob(job: Job): Promise<unknown> {
  const jobData = job.data as Record<string, unknown>;
  const { narrationId, organizationId, scriptBlocks, tone, voiceId, speed } = jobData;

  logger.info({ jobId: job.id, organizationId, narrationId }, "Processing narration job");

  try {
    await job.updateProgress(20);

    let promptVersion = "unknown";
    try {
      const versionsResponse = await axios.get(`${API_URL}/prompts/versions`);
      promptVersion = versionsResponse.data?.narration || "unknown";
    } catch {
      // Silently fail if versions endpoint is not available
    }

    const response = await axios.post(
      `${API_URL}/narrations/internal/synthesize`,
      {
        organizationId,
        narrationId,
        scriptBlocks,
        tone,
        voiceId,
        speed: speed || 1.0,
      },
    );

    await job.updateProgress(80);

    const { estimatedCostBrl, durationSec } = response.data;
    if (estimatedCostBrl) {
      logger.info(
        { jobId: job.id, organizationId, estimatedCostBrl, durationSec, promptVersion },
        "Narration synthesized",
      );
    }

    await job.updateProgress(100);
    logger.info({ jobId: job.id, organizationId, narrationId }, "Completed narration job");
    return response.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ jobId: job.id, organizationId, narrationId, err: errorMessage }, "Error calling narration API");
    throw error;
  }
}

async function processExportJob(job: Job): Promise<unknown> {
  const jobData = job.data as Record<string, unknown>;
  const { exportJobId, projectId, scriptId, narrationId, organizationId } = jobData;

  logger.info({ jobId: job.id, organizationId, exportJobId }, "Processing export job");

  try {
    await job.updateProgress(10);

    const response = await axios.post(`${API_URL}/export/internal/process`, {
      exportJobId,
      projectId,
      scriptId,
      narrationId,
      organizationId,
    });

    await job.updateProgress(90);

    const { exportUrl, zipSize } = response.data as Record<string, unknown>;
    logger.info(
      { jobId: job.id, organizationId, exportJobId, exportUrl, zipSizeKb: typeof zipSize === "number" ? (zipSize / 1024).toFixed(2) : undefined },
      "Export job completed",
    );

    await job.updateProgress(100);
    return response.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ jobId: job.id, organizationId, exportJobId, err: errorMessage }, "Error processing export job");
    throw error;
  }
}

async function processYoutubeTokenRefreshJob(job: Job): Promise<unknown> {
  logger.info({ jobId: job.id }, "Processing youtube:refresh-expiring-tokens job");
  try {
    const response = await axios.post(`${API_URL}/youtube/oauth/internal/refresh-tokens`);
    logger.info({ jobId: job.id, result: response.data }, "YouTube token refresh complete");
    return response.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ jobId: job.id, err: errorMessage }, "YouTube token refresh failed");
    throw error;
  }
}

async function processYoutubeSyncMetricsJob(job: Job): Promise<unknown> {
  logger.info({ jobId: job.id }, "Processing youtube:sync-metrics job");
  try {
    const response = await axios.post(`${API_URL}/youtube/oauth/internal/sync-metrics`);
    const { synced, failed } = response.data as { synced: number; failed: number };
    logger.info({ jobId: job.id, synced, failed }, "YouTube metrics sync complete");
    return response.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isQuota = errorMessage.toLowerCase().includes("quota");
    logger.error({ jobId: job.id, isQuota, err: errorMessage }, "YouTube metrics sync failed");
    throw error; // BullMQ applies exponential backoff per job options
  }
}

async function updateJobStatusInDatabase(
  job: Job,
  status: "processing" | "completed" | "failed",
  errorMessage?: string,
): Promise<void> {
  const jobData = job.data as Record<string, unknown>;

  if (
    jobData.projectId &&
    jobData.trendAnalysisId &&
    job.name === "generate-script"
  ) {
    const projectId = jobData.projectId as string;
    if (status === "failed") {
      await prisma.contentProject.update({
        where: { id: projectId },
        data: { status: "planning" },
      });
    }
  }

  if (
    job.name === "generate-narration" &&
    jobData.narrationId &&
    typeof jobData.narrationId === "string"
  ) {
    const narrationId = jobData.narrationId as string;
    const projectId = jobData.projectId as string;

    if (status === "completed") {
      const jobResult = (job as any).returnvalue;
      if (jobResult?.audioUrl) {
        await prisma.narration.update({
          where: { id: narrationId },
          data: {
            status: "completed",
            audioUrl: jobResult.audioUrl,
            durationSec: jobResult.durationSec || null,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.narration.update({
          where: { id: narrationId },
          data: { status: "completed", updatedAt: new Date() },
        });
      }
      if (projectId && typeof projectId === "string") {
        await prisma.contentProject.update({
          where: { id: projectId },
          data: { status: "active" },
        });
      }
    } else if (status === "processing") {
      await prisma.narration.update({
        where: { id: narrationId },
        data: { status: "processing", updatedAt: new Date() },
      });
      if (projectId && typeof projectId === "string") {
        await prisma.contentProject.update({
          where: { id: projectId },
          data: { status: "in_review" },
        });
      }
    } else if (status === "failed") {
      await prisma.narration.update({
        where: { id: narrationId },
        data: { status: "failed", updatedAt: new Date() },
      });
      if (projectId && typeof projectId === "string") {
        await prisma.contentProject.update({
          where: { id: projectId },
          data: { status: "in_development" },
        });
      }
    }
  }

  if (jobData.exportJobId && typeof jobData.exportJobId === "string") {
    const projectId = jobData.projectId as string;

    await prisma.exportJob.update({
      where: { id: jobData.exportJobId },
      data: {
        status:
          status === "completed"
            ? "completed"
            : status === "processing"
              ? "processing"
              : "failed",
        errorMessage: errorMessage || null,
        startedAt: status === "processing" ? new Date() : undefined,
        completedAt:
          status === "completed" || status === "failed" ? new Date() : undefined,
      },
    });

    if (status === "completed" && projectId && typeof projectId === "string") {
      await prisma.contentProject.update({
        where: { id: projectId },
        data: { status: "exported" },
      });
    }
  }
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const startTime = Date.now();

    try {
      logger.info({ jobId: job.id, jobName: job.name }, "Job started");
      await updateJobStatusInDatabase(job, "processing");

      let result: unknown;

      switch (job.name) {
        case "health-check":
          result = await processHealthCheckJob(job);
          break;
        case "analyze-trends":
          result = await processAnalyzeTrendsJob(job);
          break;
        case "generate-script":
          result = await processGenerateScriptJob(job);
          break;
        case "generate-narration":
          result = await processNarrationJob(job);
          break;
        case "process-export":
          result = await processExportJob(job);
          break;
        case "youtube:refresh-expiring-tokens":
          result = await processYoutubeTokenRefreshJob(job);
          break;
        case "youtube:sync-metrics":
          result = await processYoutubeSyncMetricsJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }

      await updateJobStatusInDatabase(job, "completed");
      const duration = Date.now() - startTime;
      logger.info({ jobId: job.id, jobName: job.name, durationMs: duration }, "Job completed");
      return result || { status: "completed" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;

      logger.error({ jobId: job.id, jobName: job.name, durationMs: duration, err: errorMessage }, "Job failed");

      Sentry.withScope((scope) => {
        scope.setTag("queue", QUEUE_NAME);
        scope.setTag("job.id", job.id ?? "unknown");
        scope.setTag("job.name", job.name);
        scope.setTag("job.attempts_made", String(job.attemptsMade));
        scope.setContext("job", {
          id: job.id,
          name: job.name,
          attemptsMade: job.attemptsMade,
          payload: redactJobPayload(job.data as Record<string, unknown>),
        });
        Sentry.captureException(error);
      });

      await updateJobStatusInDatabase(job, "failed", errorMessage);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
    settings: {
      lockDuration: 30000,
      lockRenewTime: 15000,
    },
  },
);

worker.on("completed", (job) => {
  logger.info({ jobId: job.id, result: job.returnvalue }, "Job completed event");
});

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, "Job failed event");
});

worker.on("error", (err) => {
  logger.error({ err }, "Worker infrastructure error");
  Sentry.captureException(err, { tags: { queue: QUEUE_NAME, "error.type": "worker_infrastructure" } });
});

worker.on("active", (job) => {
  logger.info({ jobId: job.id }, "Job is now active");
});

async function shutdown() {
  logger.info("Shutting down gracefully...");
  try {
    healthServer.close();
    await worker.close();
    await redisConnection.quit();
    await prisma.$disconnect();
    await Sentry.close(2000);
    logger.info("Shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Error during shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "Uncaught exception");
  Sentry.captureException(error, { tags: { queue: QUEUE_NAME, "error.type": "uncaught_exception" } });
  void shutdown();
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
    tags: { queue: QUEUE_NAME, "error.type": "unhandled_rejection" },
  });
});

logger.info({ queue: QUEUE_NAME, redisUrl: REDIS_URL }, "Starting BullMQ worker");
worker.on("ready", () => {
  logger.info({ queue: QUEUE_NAME }, "Worker ready and listening for jobs");
});

// ── Worker HTTP health server ──────────────────────────────────────────────────
const HEALTH_PORT = parseInt(process.env.WORKER_HEALTH_PORT || "3003", 10);

const healthServer = http.createServer((req, res) => {
  if (req.method !== "GET" || req.url !== "/health") {
    res.writeHead(404);
    res.end();
    return;
  }

  const isWorkerReady = worker.isRunning();
  const body = JSON.stringify({
    status: isWorkerReady ? "ok" : "degraded",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    worker: { queue: QUEUE_NAME, running: isWorkerReady },
  });

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(body);
});

healthServer.listen(HEALTH_PORT, () => {
  logger.info({ port: HEALTH_PORT }, "Worker health server listening");
});

// suppress unused variable warning — jobsQueue and narrationJobOptions used by external callers
void jobsQueue;
void narrationJobOptions;
