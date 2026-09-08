# Migrating Raw Queries to ORM

## 1. workspaces/repositories/base.repository.js
- `getActiveWorkspaceWithMembership`: Use `workspace_members.findFirst` with includes for `workspaces`, `plans`, `users`, and `workspace_member_roles`. Map the result to match the expected format.
- `getWorkspacesByUserId`: Use `workspaces.findMany` with includes for `users` and `plans`. Map the result.
- `getUserWorkspacesWithMembership`: Use `workspace_members.findMany` with includes for `workspaces`, `workspace_member_roles`. Map the result.
- `getAvailableWorkspaceNames`: Use `workspaces.findMany` filtering with `startsWith`.
- `createWorkspaces`:
  - Find default plan via ORM (`plans.findFirst` with custom sorting logic in JS or multiple ORM queries).
  - Use `$transaction` containing `workspaces.create`, `users.update`, `workspaces_roles.findFirst`, `workspace_members.create`, `teams.create`, `subscriptions.upsert`.
  - NOTE: `settingsRepository.createDefaultSettings` can be called inside the tx wrapper.
- `updateWorkspace`: Use `workspaces.updateMany` but first verify permissions (or simply `findFirst` the member to verify permissions, then update).
- `updateWorkspaceLogo`, `updateWorkspaceBanner`: Same pattern as `updateWorkspace` (verify permission via ORM, then update).

## 2. workspaces/repositories/members.repository.js
- `getWorkspaceMembers`: HUGE raw query. This can be complex to translate completely to ORM due to aggregations. Since it has `jsonb_agg` and subqueries (like `notes_count`, `projects`, `teams`, `last_login`), we might need to retain a simplified raw query, OR fetch the base members with Prisma and fetch their related counts/data using additional Prisma queries in parallel.
- `getAutoAssignableProjectMembers`: Raw query with `UNION ALL`. Will translate to three separate Prisma queries (workspace admins, team managers, team contributors) run in parallel, then concatenated and sorted/deduplicated in memory.
- `removeWorkspaceMember`: Currently uses `$queryRawUnsafe` for `memberInfo` to check if they are the sole admin or an admin. Can be done with `workspace_members.findFirst` and includes.

## 3. workspaces/repositories/roles.repository.js
- `getUserEffectivePermissions`: Raw query `SELECT DISTINCT perm FROM ... CROSS JOIN jsonb_array_elements_text(r.permissions)`. We can fetch the member roles via ORM and flatten the permissions array in JavaScript.

## 4. plans/repositories/plans.repository.js
- `incrementUsageCounter`: Raw query updating JSONB. Prisma doesn't support complex JSONB updates natively yet, but we can fetch the record, modify the JSON object in JavaScript, and save it back using `update`. This is fine as long as we handle race conditions, or we can keep the raw query for atomic increments. Given it's an atomic increment, retaining `jsonb_set` raw query is actually a market standard for concurrency safety unless we use optimistic locking. We'll evaluate if the user prefers strict ORM.
- `updateJsonValue`: Same as above.
- `updateLifetimeStats`: Same as above.

I'll start refactoring `workspaces/repositories/base.repository.js`.
