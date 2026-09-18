# Product Requirements Document (PRD): Personal Growth Canvas Dashboard

**Project:** Personal Growth Canvas
**Primary User:** Tomas
**Target Deployment:** Vercel (via Claude Code)
**Status:** MVP / Review Ready
**Language:** Spanish (all UI labels, placeholders, and copy in Spanish)

---

## 1. Product Overview & Vision

The Personal Growth Canvas is a single-page web application acting as a digital dashboard for personal development. It adapts the structured, compartmentalized visual style of a Lean Canvas to track behavioral parameters, core values, goals, keystone habits, and actionable tasks. The goal is to provide a unified, glanceable view of personal alignment and habit adherence without the friction of complex navigation.

## 2. UI/UX & Layout Requirements

The UI must strictly follow a box-separated dashboard layout, creating a "canvas" feel.

### 2.1 Grid Architecture

*   **Desktop View (3-Column Grid, `md` breakpoint and above):**
    *   **Left Column:** Two stacked boxes — "Habitos Clave" (top), "Problemas" (bottom).
    *   **Center Column:** Two stacked boxes — "Valores" (top), "Metas" (bottom).
    *   **Right Column:** One box — "Tareas" — spanning the full height of the left/center columns using `row-span-2`. If content is shorter than the adjacent columns, the box stretches to match. If content overflows, the box scrolls internally (`overflow-y: auto`, `max-height: 100%`).
*   **Mobile View (below `md` breakpoint):** Single column, stacked in this order: Habitos Clave → Valores → Metas → Problemas → Tareas. This order is intentional — it prioritizes daily actions (habits) and alignment (values/goals) before reflective categories (issues) and task backlog.

### 2.2 Visual Design

*   **Color Palette:** Monochrome base — white (`#FFFFFF`) card backgrounds, light gray (`#F5F5F5`) page background, dark gray (`#1A1A1A`) text, medium gray (`#E5E5E5`) borders.
*   **Accent Color:** A single subtle accent for interactive elements (checkboxes, add buttons): blue-gray (`#64748B`).
*   **Typography:** System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`). Card titles: `font-semibold text-sm uppercase tracking-wide text-gray-500`. Item text: `text-base text-gray-900`.
*   **Card Style:** `border border-gray-200 rounded-lg p-4 bg-white`. No drop shadows.
*   **Spacing:** `gap-4` between grid cells. `space-y-2` between items inside cards.

### 2.3 Header

*   Title: "Mi Dashboard" — static, non-editable.
*   Date display: Shows today's date formatted as `DD de Mes, YYYY` (e.g., "24 de Julio, 2026"). Non-editable. The date is derived from the system clock (`new Date()`), not stored in state.

## 3. Core Features (MVP)

### 3.1 Canvas Visualization

Static rendering of the 5 distinct data categories in their respective grid locations as described in Section 2.1.

### 3.2 Inline Editing & CRUD

Each card supports Add, Edit, and Delete operations:

*   **Add:** A `+ Agregar` button at the bottom of each card. Clicking it appends a new empty item and immediately focuses an inline text input for the user to type the item text. Pressing `Enter` or blurring the input saves the item. Pressing `Escape` or saving with empty text cancels and removes the item.
*   **Edit:** Single-click on any item's text replaces it with an inline `<input>` pre-filled with the current text. `Enter` or blur saves. `Escape` reverts to the original text.
*   **Delete:** Each item shows a trash icon on the right side. On desktop, the icon is visible on row hover. On mobile/touch, the icon is always visible (hover does not exist on touch devices). Clicking the trash icon deletes the item immediately — no confirmation dialog (items are simple text; localStorage makes accidental deletes low-cost and the user can re-add quickly).

### 3.3 State Tracking & Interactivity

*   **Habitos Clave:** Each item has a checkbox. Checking it applies a subtle visual change: `opacity-60` and the checkbox fills. Habits reset daily (see Section 5).
*   **Tareas:** Each item has a checkbox. Checking it applies `line-through text-gray-400 opacity-60`. Completed tasks do NOT reset daily — they persist until manually deleted.
*   **Valores, Metas, Problemas:** Rendered as plain text lists. No checkboxes, no completion state.

### 3.4 Empty States

When all items in a card are deleted, display centered placeholder text in `text-gray-400 italic`: "Sin elementos. Agrega uno nuevo." The `+ Agregar` button remains visible below.

### 3.5 Item Ordering

New items are appended to the bottom of the list. No drag-and-drop reordering in MVP. Items maintain insertion order.

## 4. Date & Daily Reset Behavior

This is the core daily-use mechanic.

### 4.1 Rules

1.  The app displays today's date based on the system clock. There is no date picker or historical navigation in MVP.
2.  On each app load, the app compares today's date against the `lastActiveDate` stored in localStorage.
3.  If the date has changed (new day):
    *   All `keystone_habits` items have their `completed` property reset to `false`.
    *   All `tasks` items retain their current `completed` state (tasks are not daily).
    *   `lastActiveDate` is updated to today's date.
4.  If the date is the same, no reset occurs.

### 4.2 Edge Cases

*   If the user leaves the tab open overnight, the reset triggers on the next interaction that reads state (e.g., checking a habit). Implement this by checking the date on every state mutation, not just on mount.
*   If `lastActiveDate` is missing (first launch), set it to today and do not reset anything.

## 5. Data Schema & Initial State

The application initializes with the following JSON structure seeded into localStorage on first launch (i.e., when no existing data is found). If data already exists in localStorage, it is loaded instead.

### 5.1 localStorage Keys

*   `pgc_data` — The full dashboard state (JSON stringified).
*   `pgc_schema_version` — Integer. Current version: `2`.

### 5.2 Schema Migration

On app load, compare the stored `pgc_schema_version` against the app's current version. If the stored version is older, run migration logic. If no version key exists, treat it as v1 and write the version key. This prepares the app for future schema changes without breaking existing users.

Version history:

*   **v1** — Initial schema (MVP).
*   **v2** — Added optional `note` field on all items (post-it notes). Additive change; v1 data loads unchanged.

### 5.3 Initial Seed Data

The app initializes with **empty categories** on first launch — new users start with blank cards (each showing its empty-state placeholder) and build their own dashboard. The example below is illustrative only, showing the data shape with generic content:

```json
{
  "lastActiveDate": "2026-07-24",
  "categories": {
    "keystone_habits": [
      {"id": "kh-1", "text": "Ejercicio", "completed": false, "note": "30 minutos en la manana"},
      {"id": "kh-2", "text": "Leer 20 minutos", "completed": false},
      {"id": "kh-3", "text": "Meditacion", "completed": false}
    ],
    "issues": [
      {"id": "is-1", "text": "Procrastinacion"},
      {"id": "is-2", "text": "Desorden en los horarios"}
    ],
    "valores": [
      {"id": "vl-1", "text": "Salud"},
      {"id": "vl-2", "text": "Familia"},
      {"id": "vl-3", "text": "Aprendizaje continuo"}
    ],
    "metas": [
      {"id": "mt-1", "text": "Correr 10K"},
      {"id": "mt-2", "text": "Ahorrar para un viaje"}
    ],
    "tasks": [
      {"id": "tk-1", "text": "Renovar el pasaporte", "completed": false},
      {"id": "tk-2", "text": "Organizar el escritorio", "completed": false}
    ]
  }
}
```

### 5.4 ID Generation

IDs use the format `{category_prefix}-{crypto.randomUUID()}` (e.g., `kh-a1b2c3d4-...`). The seed data uses short IDs for readability, but all new items created by the user must use `crypto.randomUUID()` with the appropriate prefix (`kh-`, `is-`, `vl-`, `mt-`, `tk-`).

## 6. Technical Stack & Execution Notes

*   **Framework:** Next.js (App Router). Single page — no routing needed beyond the index route.
*   **Styling:** Tailwind CSS. Use utility classes for the CSS Grid layout. Reference the design tokens in Section 2.2.
*   **State Management:** React `useState` and `useEffect`. No external state library.
*   **Storage:** `window.localStorage`. Must handle hydration safely — wrap localStorage access in a `useEffect` or use a `mounted` flag to prevent SSR/client mismatch. Render nothing (or a skeleton with the same grid dimensions) until client-side hydration is complete, to avoid layout flash.
*   **localStorage Unavailability:** If localStorage is not available (e.g., private browsing in some browsers), the app should still render with the seed data in-memory. Changes will not persist. No error message needed — graceful degradation.
*   **Deployment Target:** Vercel.
*   **Accessibility:**
    *   All checkboxes must have associated `<label>` elements.
    *   Inline edit inputs must receive focus automatically when activated.
    *   The `+ Agregar` button and trash icons must be keyboard-accessible (`tabindex`, `Enter`/`Space` to activate).
    *   Use `aria-label` on icon-only buttons (e.g., trash icon: `aria-label="Eliminar"`).

## 7. Acceptance Criteria (MVP)

| # | Criterion | Category |
|---|-----------|----------|
| 1 | All 5 cards render in the correct grid layout on desktop (3-col) and mobile (1-col). | Layout |
| 2 | Checking a habit checkbox marks it visually and persists on page reload (same day). | Habits |
| 3 | Reloading the app on a new day resets all habit checkboxes to unchecked. | Daily Reset |
| 4 | Task checkboxes persist across days — they do not reset. | Tasks |
| 5 | User can add a new item to any card via the `+ Agregar` button. | CRUD |
| 6 | User can inline-edit any item's text by clicking on it. | CRUD |
| 7 | User can delete any item via the trash icon. | CRUD |
| 8 | All CRUD changes persist in localStorage across page reloads. | Persistence |
| 9 | App renders correctly on first visit with seed data. | Init |
| 10 | No hydration mismatch warnings in the console. | Technical |
| 11 | Delete icons are always visible on mobile (no hover dependency). | Mobile |
| 12 | Empty card shows placeholder text and the add button. | Empty State |

## 8. Future Scope (Not in MVP)

*   User Authentication.
*   Database integration (e.g., Vercel Postgres or Supabase).
*   Historical tracking (viewing past days' habit completion).
*   Drag-and-drop reordering within cards.
*   Dark mode.
*   PWA support for offline/mobile home screen usage.
