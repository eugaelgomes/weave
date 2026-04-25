const redis = require("../config/redis");
const { executeQuery } = require("../database/connection");
const { logger } = require("../lib");
const { verifyDomainToken } = require("../services/domains");
const {
  DOMAIN_VERIFY_RETRY_INTERVAL_MS,
  getDomainVerifyDelayedQueueRedisKey,
  getDomainVerifyQueueRedisKey,
} = require("../config/redis-queue-keys");

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
    const domainId = job?.domainId;
    const requestedByUserId = job?.requestedByUserId;
    const retryCount = Number(job?.retryCount || 0);

    if (!domainId) {
      logger.warn("Skipping domain verification job without domainId");
      return;
    }

    const domain = await this.findActiveDomainById(domainId);
    if (!domain) {
      logger.warn("Domain not found for verification job", { domainId });
      return;
    }

    if (domain.status === "VERIFIED") {
      logger.debug("Domain already verified, skipping verification job", {
        domainId,
        domainName: domain.domain_name,
      });
      return;
    }

    const { checkedHosts, isVerified } = await verifyDomainToken(
      domain.domain_name,
      domain.verification_token
    );

    if (!isVerified) {
      await this.scheduleRetry({
        domainId,
        requestedByUserId,
        retryCount: retryCount + 1,
      });
      logger.info("Domain DNS token not found, retry scheduled", {
        checkedHosts,
        domainId,
        domainName: domain.domain_name,
        retryCount: retryCount + 1,
      });
      return;
    }

    await this.markDomainAsVerified(domain.id);
    await this.refreshOrganizationDomainsCache(domain.organization_id);
    await this.promoteRequesterToSuperAdminIfAllowed({
      organizationId: domain.organization_id,
      requestedByUserId,
    });

    logger.info("Domain verified by worker", {
      domainId: domain.id,
      domainName: domain.domain_name,
      organizationId: domain.organization_id,
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

  async findActiveDomainById(domainId) {
    const query = `
      SELECT *
      FROM organization_domains
      WHERE id = $1
        AND deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [domainId]);
    return results[0] || null;
  }

  async markDomainAsVerified(domainId) {
    const query = `
      UPDATE organization_domains
      SET status = 'VERIFIED',
          verified_at = NOW(),
          updated_at = NOW()
      WHERE id = $1;
    `;
    await executeQuery(query, [domainId]);
  }

  async refreshOrganizationDomainsCache(organizationId) {
    const query = `
      UPDATE organizations o
      SET org_domains = (
        SELECT COALESCE(
          array_agg(od.domain_name ORDER BY od.domain_name),
          '{}'::text[]
        )
        FROM organization_domains od
        WHERE od.organization_id = $1
          AND od.status = 'VERIFIED'
          AND od.deleted = false
      ),
      updated_at = NOW()
      WHERE o.id = $1;
    `;
    await executeQuery(query, [organizationId]);
  }

  async promoteRequesterToSuperAdminIfAllowed({
    organizationId,
    requestedByUserId,
  }) {
    if (!requestedByUserId) return;

    const roleQuery = `
      SELECT role
      FROM organization_members
      WHERE organization_id = $1
        AND user_id = $2
        AND area_id IS NULL
        AND deleted = false
      LIMIT 1;
    `;

    const roleResult = await executeQuery(roleQuery, [
      organizationId,
      requestedByUserId,
    ]);

    const currentRole = roleResult[0]?.role;
    if (!currentRole || currentRole === "SUPER_ADMIN") return;

    const superAdminCountQuery = `
      SELECT COUNT(*)::int AS total
      FROM organization_members
      WHERE organization_id = $1
        AND area_id IS NULL
        AND role = 'SUPER_ADMIN'
        AND deleted = false
        AND suspended = false;
    `;
    const countResult = await executeQuery(superAdminCountQuery, [
      organizationId,
    ]);
    const currentSuperAdmins = countResult[0]?.total || 0;
    if (currentSuperAdmins >= 3) return;

    await executeQuery(
      `
        UPDATE organization_members
        SET role = 'SUPER_ADMIN',
            updated_at = NOW()
        WHERE organization_id = $1
          AND user_id = $2
          AND area_id IS NULL;
      `,
      [organizationId, requestedByUserId]
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
