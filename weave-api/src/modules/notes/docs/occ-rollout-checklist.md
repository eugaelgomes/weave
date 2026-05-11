# Notes OCC Rollout Checklist

## Metrics

- Track `notes.update.conflict` occurrences per minute.
- Track `notes.blocks.patch.conflict` and `notes.blocks.sync.conflict` occurrences.
- Monitor mean autosave latency for metadata and block patch endpoints.
- Monitor `4xx` rate split by `400` vs `409` for notes endpoints.

## Backend Validation

- Verify `notes.revision` migration executed in all environments.
- Verify `PUT /notes/:id` returns `409` when `baseRevision` is stale.
- Verify `PATCH /notes/:noteId/blocks/:blockId` returns `409` when `expectedVersion` is stale.
- Verify `PUT /notes/:noteId/blocks` returns `409` when `baseRevision` is stale.
- Verify `ENABLE_NOTES_OCC_REQUIRED=true` enforces `baseRevision` for `PUT /notes/:id`.

## Frontend Validation

- Edit title/description continuously while autosave is in flight and validate no text loss.
- Edit block text while re-fetch occurs and validate local draft is preserved.
- Open two tabs for the same note and validate conflict banner appears for stale writes.
- Validate conflict actions:
  - Retry save after conflict.
  - Reload latest server state.

## Rollout Plan

1. Deploy migration and backend conflict payload support.
2. Deploy frontend conflict-aware save flow (`baseRevision` and `expectedVersion`).
3. Keep `ENABLE_NOTES_OCC_REQUIRED=false` for observation window.
4. Enable `ENABLE_NOTES_OCC_REQUIRED=true` progressively per environment.
5. Watch conflict metrics and autosave error rate before full rollout.
