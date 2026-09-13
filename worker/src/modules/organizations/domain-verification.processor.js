const { redisConsumer: redis } = require("@theweave/database");
const { executeQuery } = require("../../database/connection");
const { logger } = require("@theweave/database");
const { verifyDomainToken } = require("./verifier");
const {
  DOMAIN_VERIFY_RETRY_INTERVAL_MS,
  getDomainVerifyDelayedQueueRedisKey,
  getDomainVerifyQueueRedisKey,
} = require("../../queues/queue-queue-keys");

const DUE_JOB_BATCH_SIZE = 100;
const DUE_JOB_POLL_INTERVAL_MS = 15 * 1000;

class DomainVerificationProcessor {
  constructor() {
    this.isRunning = false;
    this.delayedQueueIntervalId = null;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.queueName = getDomainVerifyQueueRedisKey();
    this.delayedQueueName = getDomainVerifyDelayedQueueRedisKey();

    this.delayedQueueIntervalId = setInterval(() => {
      this.moveDueDelayedJobs().catch((error) => {
        logger.error("Failed to move due domain verification jobs", {
          error: error.message,
        });
      });
    }, DUE_JOB_POLL_INTERVAL_MS);

    await this.moveDueDelayedJobs();

    logger.info("Domain verification processor started", {
      delayedQueue: this.delayedQueueName,
      queue: this.queueName,
      retryIntervalMs: DOMAIN_VERIFY_RETRY_INTERVAL_MS,
    });

    while (this.isRunning) {
      try {
        const result = await redis.blpop(this.queueName, 5);
        if (!result) continue;

        const [, payload] = result;
        const job = JSON.parse(payload);
        await this.processJob(job);
      } catch (error) {
        logger.error("Domain verification processor loop failed", {
          error: error.message,
        });
      }
    }
  }

  async processJob(job) {
    const workspaceId = job?.workspaceId;
    const domainName = job?.domainName;
    const requestedByUserId = job?.requestedByUserId;
    const retryCount = Number(job?.retryCount || 0);

    if (!workspaceId || !domainName) {
      logger.warn("Skipping domain verification job without workspaceId or domainName");
      return;
    }

    const domain = await this.findActiveDomain(workspaceId, domainName);
    if (!domain) {
      logger.warn("Domain not found for verification job", { domainName, workspaceId });
      return;
    }

    if (domain.status === "VERIFIED") {
      logger.debug("Domain already verified, skipping verification job", {
        domainName,
        workspaceId,
      });
      return;
    }

    const { checkedHosts, isVerified } = await verifyDomainToken(
      domainName,
      domain.verification_token
    );

    if (!isVerified) {
      await this.scheduleRetry({
        domainName,
        workspaceId,
        requestedByUserId,
        retryCount: retryCount + 1,
      });
      logger.info("Domain DNS token not found, retry scheduled", {
        checkedHosts,
        domainName,
        workspaceId,
        retryCount: retryCount + 1,
      });
      return;
    }

    await this.markDomainAsVerified(workspaceId, domainName);
    await this.promoteRequesterToSuperAdminIfAllowed({
      workspaceId,
      requestedByUserId,
    });

    logger.info("Domain verified by worker", {
      domainName,
      workspaceId,
      retryCount,
    });
  }

  async moveDueDelayedJobs() {
    const dueJobs = await redis.zrangebyscore(
      this.delayedQueueName,
      0,
      Date.now(),
      "LIMIT",
      0,
      DUE_JOB_BATCH_SIZE
    );

    if (dueJobs.length === 0) return;

    const pipeline = redis.pipeline();
    for (const jobPayload of dueJobs) {
      pipeline.zrem(this.delayedQueueName, jobPayload);
      pipeline.lpush(this.queueName, jobPayload);
    }
    await pipeline.exec();
  }

  async scheduleRetry(job) {
    const runAt = Date.now() + DOMAIN_VERIFY_RETRY_INTERVAL_MS;
    await redis.zadd(this.delayedQueueName, runAt, JSON.stringify(job));
  }

  async findActiveDomain(workspaceId, domainName) {
    const query = `
      SELECT domains
      FROM workspace_settings
      WHERE workspace_id = $1 AND deleted = false
    `;
    const results = await executeQuery(query, [workspaceId]);
    if (!results[0]) return null;
    const domains = results[0].domains || [];
    return domains.find((d) => d.domain_name === domainName) || null;
  }

  async markDomainAsVerified(workspaceId, domainName) {
    const query = `
      SELECT domains
      FROM workspace_settings
      WHERE workspace_id = $1 AND deleted = false
    `;
    const results = await executeQuery(query, [workspaceId]);
    if (!results[0]) return;
    const domains = results[0].domains || [];
    const index = domains.findIndex((d) => d.domain_name === domainName);
    if (index === -1) return;

    domains[index].status = "VERIFIED";
    domains[index].verified_at = new Date().toISOString();

    const updateQuery = `
      UPDATE workspace_settings
      SET domains = $2::jsonb, updated_at = NOW()
      WHERE workspace_id = $1 AND deleted = false
    `;
    await executeQuery(updateQuery, [workspaceId, JSON.stringify(domains)]);
  }

  async promoteRequesterToSuperAdminIfAllowed({ workspaceId, requestedByUserId }) {
    if (!requestedByUserId) return;

    const roleQuery = `
      SELECT role
      FROM workspace_members
      WHERE workspace_id = $1
        AND user_id = $2
        AND area_id IS NULL
        AND deleted = false
      LIMIT 1;
    `;

    const roleResult = await executeQuery(roleQuery, [workspaceId, requestedByUserId]);

    const currentRole = roleResult[0]?.role;
    if (!currentRole || currentRole === "SUPER_ADMIN") return;

    const superAdminCountQuery = `
      SELECT COUNT(*)::int AS total
      FROM workspace_members
      WHERE workspace_id = $1
        AND area_id IS NULL
        AND role = 'SUPER_ADMIN'
        AND deleted = false
        AND suspended = false;
    `;
    const countResult = await executeQuery(superAdminCountQuery, [workspaceId]);
    const currentSuperAdmins = countResult[0]?.total || 0;
    if (currentSuperAdmins >= 3) return;

    await executeQuery(
      `
        UPDATE workspace_members
        SET role = 'SUPER_ADMIN',
            updated_at = NOW()
        WHERE workspace_id = $1
          AND user_id = $2
          AND area_id IS NULL;
      `,
      [workspaceId, requestedByUserId]
    );
  }

  stop() {
    this.isRunning = false;
    if (this.delayedQueueIntervalId) {
      clearInterval(this.delayedQueueIntervalId);
      this.delayedQueueIntervalId = null;
    }
  }
}

module.exports = new DomainVerificationProcessor();
