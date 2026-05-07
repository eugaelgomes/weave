/**
 * When the API returns 403 PLAN_LIMIT_EXCEEDED, refresh plan usage in the UI.
 * Registered from PlanUsageProvider.
 */

export type PlanLimitSyncHandler = () => void | Promise<void>;

let planLimitSyncHandler: PlanLimitSyncHandler | null = null;

export function setPlanLimitSyncHandler(handler: PlanLimitSyncHandler | null): void {
  planLimitSyncHandler = handler;
}

export function notifyPlanLimitExceededSync(): void {
  const h = planLimitSyncHandler;
  if (h) {
    void Promise.resolve(h()).catch(() => {});
  }
}
