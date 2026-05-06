---
name: Projects UI Gap Analysis
overview: Audit of backend routes vs frontend consumption for the Projects module, identifying unconsumed routes and a plan to build their UIs.
todos:
  - id: sprint-service
    content: Create service layer functions for sprint CRUD (fetchSprints, fetchActiveSprint, createSprint, completeSprint)
    status: completed
  - id: sprint-context
    content: Add sprint methods to projects-context.tsx
    status: completed
  - id: sprint-ui
    content: Build Sprints management UI (list, active banner, create form, complete action)
    status: completed
  - id: reasoning-service
    content: Create service layer functions for all 6 reasoning endpoints
    status: completed
  - id: reasoning-context
    content: Add reasoning methods to projects-context.tsx
    status: completed
  - id: reasoning-ui
    content: Build Reasonings / AI Analysis UI (list, detail, action items, interaction)
    status: completed
  - id: report-config-read
    content: Add fetchAiReportConfig service function and edit UI in project details
    status: completed
  - id: stage-management
    content: Add stage delete service/context and enhance stage section in details page (delete, add, reorder)
    status: completed
isProject: false
---

# Projects Module: Route Audit and UI Creation Plan

## 1. Backend Routes Inventory (all under `/api/projects`, auth required)

| # | Method | Path | Controller | Description |
|---|--------|------|------------|-------------|

### Core CRUD
- `GET /` - List all projects
- `GET /stats` - Dashboard stats
- `POST /` - Create project
- `GET /:id` - Get project by ID
- `PUT /:id` - Update project (with file upload)
- `PATCH /:projectId` - Update project (JSON only)
- `DELETE /:id` - Delete project
- `DELETE /:projectId` - Delete project (duplicate route)

### Stages
- `GET /:id/stages` - List stages
- `PATCH /:id/stages/:stageId` - Update stage
- `DELETE /:id/stages/:stageId` - Delete stage

### Collaborators
- `GET /:projectId/collaborators` - List collaborators
- `POST /:projectId/collaborators` - Add collaborator
- `PATCH /:projectId/collaborators/:collaboratorId` - Update collaborator permission
- `PUT /:projectId/collaborators/:collaboratorId` - Update collaborator permission (duplicate)

### Notes
- `GET /:projectId/notes` - List associated notes
- `PUT /:projectId/notes` - Manage notes (add/sync/remove)
- `PUT /:projectId/notes/:noteId/stage` - Update note stage

### AI Report Config
- `GET /:id/ai-report-config` - Get AI report config
- `PUT /:id/ai-report-config` - Update AI report config

### Sprints
- `GET /:id/sprints` - List sprints
- `GET /:id/sprints/active` - Get active sprint
- `POST /:id/sprints` - Create sprint
- `PATCH /:id/sprints/:sprintId/complete` - Complete sprint

### Reasonings (AI Analysis)
- `GET /:id/reasonings` - List reasonings
- `GET /:id/reasonings/:reasoningId` - Get reasoning by ID
- `GET /:id/reasonings/:reasoningId/action-items` - Get reasoning action items
- `POST /:id/reasonings` - Create reasoning
- `PATCH /:id/reasonings/:reasoningId/interaction` - Update reasoning interaction
- `PATCH /:id/reasonings/:reasoningId/action-items/:itemId` - Update reasoning action item

---

## 2. Routes with UI (Consumed by Frontend)

These routes have full or partial frontend coverage with user-facing views:

- **`GET /`** -- consumed by `projects-context.tsx` -> [page.tsx](weave-app/app/(protected)/projects/page.tsx) (projects listing/overview dashboard)
- **`GET /stats`** -- consumed by `projects-service.ts` (used in context, but the overview page builds stats client-side from project data instead of using this endpoint directly)
- **`POST /`** -- consumed by [new/page.tsx](weave-app/app/(protected)/projects/new/page.tsx) (create project form with methodology, stages, collaborators, AI reports)
- **`GET /:id`** -- consumed by [[id]/page.tsx](weave-app/app/(protected)/projects/[id]/page.tsx) (project board view)
- **`PUT /:id`** -- consumed by [[id]/details/page.tsx](weave-app/app/(protected)/projects/[id]/details/page.tsx) (auto-save edit form with icon upload)
- **`DELETE /:id`** -- consumed by `[id]/details/page.tsx` (delete button, owner only)
- **`GET /:id/stages`** -- consumed by `[id]/page.tsx` and `[id]/details/page.tsx`
- **`PATCH /:id/stages/:stageId`** -- consumed by `new/page.tsx` (customizing stages during creation)
- **`GET /:projectId/collaborators`** -- consumed by both `[id]/page.tsx` and `[id]/details/page.tsx`
- **`POST /:projectId/collaborators`** -- consumed by `[id]/details/page.tsx` and [add-collaborator-modal.tsx](weave-app/app/(protected)/projects/_components/modals/add-collaborator-modal.tsx)
- **`PATCH /:projectId/collaborators/:collaboratorId`** -- consumed by `[id]/details/page.tsx` (permission dropdown)
- **`GET /:projectId/notes`** -- consumed by `[id]/page.tsx` (board cards)
- **`PUT /:projectId/notes`** -- consumed by [add-note-modal.tsx](weave-app/app/(protected)/projects/_components/modals/add-note-modal.tsx) (add note) and [project-board.tsx](weave-app/app/(protected)/projects/_components/project-board.tsx) (remove note)
- **`PUT /:projectId/notes/:noteId/stage`** -- consumed by `project-board.tsx` (drag & drop)
- **`PUT /:id/ai-report-config`** -- consumed by `new/page.tsx` (during project creation only)

---

## 3. Routes WITHOUT Frontend UI (Not Consumed)

These backend routes exist but have **no frontend view, no service function, and/or no context method**:

### 3.1 -- Sprints (4 routes, 0 UI)
- `GET /:id/sprints` -- list all sprints
- `GET /:id/sprints/active` -- get active sprint
- `POST /:id/sprints` -- create new sprint
- `PATCH /:id/sprints/:sprintId/complete` -- complete a sprint

**Status:** No service function, no context method, no UI at all. The sprint concept is referenced only in the AI report config form (`default_sprint_duration_days`, `auto_create_next_sprint`) and in the home dashboard as mock/static data.

### 3.2 -- Reasonings / AI Analysis (6 routes, 0 UI)
- `GET /:id/reasonings` -- list reasonings
- `GET /:id/reasonings/:reasoningId` -- get reasoning detail
- `GET /:id/reasonings/:reasoningId/action-items` -- get action items
- `POST /:id/reasonings` -- create reasoning (trigger AI analysis)
- `PATCH /:id/reasonings/:reasoningId/interaction` -- update interaction
- `PATCH /:id/reasonings/:reasoningId/action-items/:itemId` -- toggle/update action item

**Status:** No service function, no context method, no UI at all.

### 3.3 -- AI Report Config Read (1 route, partial UI)
- `GET /:id/ai-report-config` -- read current config

**Status:** The PUT (write) is consumed during project creation, but there is no UI to **view or edit** the AI report config after the project is created. No read service function exists.

### 3.4 -- Stage Delete (1 route, 0 UI)
- `DELETE /:id/stages/:stageId` -- delete a stage

**Status:** Stages are shown read-only in `[id]/details/page.tsx`. There is no UI to delete a stage. The service function `deleteProjectStage` does not exist in the frontend service layer either.

### 3.5 -- Collaborator Remove (partial)
- Collaborator removal exists in `[id]/details/page.tsx` via the context method `removeCollaborator`, but the `[id]/page.tsx` board view has no direct remove button (only the modals have add).

---

## 4. Plan for Missing UIs

### Phase 1: Sprints Management UI
**Location:** New page `weave-app/app/(protected)/projects/[id]/sprints/page.tsx` or a tab/section within `[id]/page.tsx`.

**What to build:**
- Service layer: Create functions in `projects-service.ts` for `fetchSprints`, `fetchActiveSprint`, `createSprint`, `completeSprint`
- Context: Add sprint methods to `projects-context.tsx`
- UI: A sprint panel/section accessible from the project view with:
  - Active sprint banner (name, start/end dates, progress)
  - Sprint list (past sprints with completion status)
  - "Create Sprint" form (name, start date, end date, goal)
  - "Complete Sprint" action button with confirmation
  - Sprint-scoped note filtering (show only notes in current sprint)

### Phase 2: Reasonings / AI Analysis UI
**Location:** New page `weave-app/app/(protected)/projects/[id]/reasonings/page.tsx` or as a panel within the project view.

**What to build:**
- Service layer: Create functions for all 6 reasoning endpoints
- Context: Add reasoning methods to `projects-context.tsx`
- UI:
  - Reasoning list view (past AI analyses with timestamps)
  - "Request Analysis" button to create a new reasoning
  - Reasoning detail view (AI-generated insights, markdown rendered)
  - Action items checklist (toggle completion, update notes)
  - Interaction history (follow-up questions/responses)

### Phase 3: AI Report Config Editor (post-creation)
**Location:** Section within `[id]/details/page.tsx` or a dedicated tab.

**What to build:**
- Service layer: Add `fetchAiReportConfig` function
- Context: Add report config read/update methods
- UI: Reuse the form structure from `new/page.tsx` (report time, channels, sprint duration, toggles) but adapted for editing an existing config with current values pre-populated

### Phase 4: Stage Management Enhancements
**Location:** Enhance the existing stages section in `[id]/details/page.tsx`.

**What to build:**
- Service layer: Add `deleteProjectStage` function
- Context: Add delete stage method
- UI enhancements:
  - Delete button per stage (with confirmation and warning about orphaned notes)
  - Add new stage button (requires a create stage endpoint -- verify if backend supports this)
  - Inline edit for stage name/color (already partially supported via `patchProjectStage`)
  - Drag to reorder stages

---

## 5. Priority Recommendation

1. **Phase 1 (Sprints)** -- High priority. Sprint management is fundamental for Scrum methodology projects. The backend is ready and the data model references sprints throughout.
2. **Phase 3 (AI Report Config)** -- Medium priority. Quick win since the form already exists in `new/page.tsx` and can be extracted as a reusable component.
3. **Phase 4 (Stage Management)** -- Medium priority. Improves board customization which is core UX.
4. **Phase 2 (Reasonings)** -- Lower priority but high value. Requires understanding the reasoning data shape from the backend controller/repository before designing the UI.
