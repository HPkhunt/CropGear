# UI/UX Roadmap â€” shadcn/ui Migration

> Single source of truth for migrating CropGear's frontend from vanilla CSS to **Tailwind CSS + shadcn/ui**.

> [!CAUTION]
> **Core rule â€” Swap and Remove:** Every old component file and its CSS **must be deleted immediately** after all its consumers have been migrated to the shadcn/ui replacement. Never leave both old and new versions in the codebase at the same time. If a component is swapped, the old file is deleted in the *same* commit.

> [!NOTE]
> **Repository scope:** All frontend paths below are relative to `frontend/`. Run frontend commands from `frontend/` directly, or from the repo root with `npm --prefix frontend run <script>`.

## Progress Update (2026-03-27, Session 2)

- **Roadmap status: PHASE 1 COMPLETE → PHASE 2 GROUP B COMPLETE**
  - Navbar migration: ✅ search removed, role-specific messaging links repositioned, build passing
  - Foundation components: ✅ shadcn/ui primitives in place (card, button, input, badge, alert, dialog, popover, command, etc.)
  - Auth pages: ✅ Login, Register, ForgotPassword, ResetPassword all fully migrated (100% complete)
  - Shared components: ✅ FavoriteButton, SearchHistoryPanel, DashboardShell already using shadcn/ui patterns
  - Toast notifications: ✅ ActionFeedback removed across the app (toast UX now uniform via `useToast()`)
  - **Next: Dashboard-heavy slices (Phase 2 C–F)** and then Phase 3 cleanup

- Phase 0 foundation is now LOCKED and verified in code:
  - `frontend/components.json` has been added for reproducible shadcn metadata
  - Missing baseline primitives have been added under `frontend/src/components/ui/`: `select`, `checkbox`, `tabs`, `sheet`, `navigation-menu`, `popover`, `command`, `table`, `dropdown-menu`, `tooltip`, and `avatar`
  - The current form direction is now the composable primitive path (`Input` + `Label` + `Textarea` + native handlers), not `react-hook-form`
  - The existing custom dialog path is still in use, but it is now the shared base for modal/sheet work instead of the older standalone modal implementation
- Shared UI migration is also underway in live app code:
  - `Navbar.jsx`, `DashboardShell.jsx`, `Footer.jsx`, `AuthPortal.jsx`, `Loader.jsx`, `PageSkeleton.jsx`, `SearchHistoryPanel.jsx`, `FavoriteButton.jsx`, `EquipmentCard.jsx`, and `BookingCard.jsx` now render through the Tailwind/shadcn-style primitives instead of the legacy presentation layer
  - Auth entry routes have been migrated onto the new card/input/button/tabs patterns: `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, and `ResetPassword.jsx`
  - **Navbar navigation is finalized:** search remains removed, and Messages/Reviews role links are present in the role menu.
- Validation baseline after this implementation pass:
  - `npm --prefix frontend run build`
  - `npm --prefix frontend run test:run`
  - `npm --prefix frontend run lint`
- Phase 1 (Primitives Swap) completion status:
  - ✅ `badge`, `alert`, `card` - all auth and dashboard consumers migrated
  - ✅ `input`, `label`, `textarea` - form fields active
  - ✅ `button`, `dialog`, `skeleton` - core interactions ready
  - ⏳ `select`, `checkbox`, `tabs`, `sheet`, `navigation-menu`, `popover`, `command`, `table`, `dropdown-menu`, `tooltip`, `avatar` - in place but not yet fully consumed across all pages
  - ❌ Old files (Card.jsx, Form.jsx, Modal.jsx, etc.) still present but unused

- Remaining work (Phases 2-4):
  - **Phase 2 (Page Migration):** Home.jsx, Dashboard pages, chat/booking workflows still use legacy CSS classes
  - **Phase 3 (Cleanup):** Delete index.css/premium-updates.css rules and old component files after Phase 2 completion
  - **Phase 4 (Polish):** A11y audit, responsive validation, performance tuning

---

## 1  Current State Snapshot

| Dimension | Today |
|---|---|
| **Framework** | Vite 5 + React 18 |
| **Styling** | Legacy CSS still lives in `frontend/src/index.css` (~6,891 lines) plus `frontend/src/premium-updates.css` (~917 lines); Tailwind tokens live in `frontend/src/globals.css` |
| **Icons** | `lucide-react` (already shadcn-compatible) |
| **Routing** | `react-router-dom` v6 |
| **Custom components** | 54 component files in `frontend/src/components/`, including 10 current `ui/` primitives |
| **Pages** | 36 page files in `frontend/src/pages/` across public, auth, farmer, owner, admin, chat, account, and bookings flows |
| **Tests** | 3 frontend test files (`BookingCard.test.jsx`, `bookings.test.js`, `passwordPolicy.test.js`) |
| **Tailwind** | Installed (v4) and imported in `frontend/src/main.jsx`; legacy CSS still coexists with the new design tokens |

### Existing Custom Components (to be swapped)

| File | Exports | shadcn/ui Replacement |
|---|---|---|
| `Card.jsx` | `Card`, `CardHeader`, `CardBody`, `CardFooter`, `Badge`, `Alert` | `card`, `badge`, `alert` |
| `Modal.jsx` | `Modal` | `dialog` |
| `Form.jsx` | `TextField`, `TextArea`, `Select`, `Checkbox`, `Form`, `FormGroup` | `input`, `textarea`, `select`, `checkbox`, `label`, optional shadcn `form` |
| `Loader.jsx` | `Loader` | `skeleton` / custom spinner |
| `DashboardShell.jsx` | `DashboardShell` | `sidebar` + `sheet` (mobile) |
| `EmptyState.jsx` | `EmptyState` | Keep custom, restyle with Tailwind |
| `ActionFeedback.jsx` | `ActionFeedback` | `alert` or `sonner` (toast) |
| `PageHero.jsx` | `PageHero` | Keep custom, restyle with Tailwind |
| `PageSkeleton.jsx` | `PageSkeleton` | `skeleton` |
| `SearchHistoryPanel.jsx` | `SearchHistoryPanel` | `popover` + `command` |
| `AuthPortal.jsx` | `AuthPortal` | `card` + `tabs` |
| `BookingCard.jsx` | `BookingCard` | `card` + `badge` + `button` |
| `EquipmentCard.jsx` | `EquipmentCard` | `card` + `badge` + `button` |
| `FavoriteButton.jsx` | `FavoriteButton` | `toggle` or `button` variant |
| `Navbar.jsx` | `Navbar` | `navigation-menu` + `sheet` (mobile) |
| `Footer.jsx` | `Footer` | Keep custom, restyle with Tailwind |
| `SmartImage.jsx` | `SmartImage` | Keep custom, restyle with Tailwind |
| `reviews/*` | `ReviewCard`, `ReviewComposerModal`, `ReviewStars`, `ReviewSummaryPanel`, `ReviewTextActionModal` | `card`, `dialog`, custom stars, `card`, `dialog` |

### Current Foundation Already In Repo

- `@/` alias already exists in `frontend/jsconfig.json` and `frontend/vite.config.mjs`
- Existing `frontend/src/components/ui/` primitives: `alert`, `badge`, `button`, `card`, `dialog`, `input`, `label`, `separator`, `skeleton`, `textarea`
- `StyleGuide.jsx`, `Docs.jsx`, and `Landing.jsx` already consume the new primitives
- `sonner` is now wired globally through `frontend/src/components/ui/sonner.jsx` and `frontend/src/hooks/useToast.js`
- ✅ `frontend/components.json` is present, so future `shadcn` CLI usage is reproducible across the team

---

## 2  Pre-Migration Prerequisites

Complete **all** of the following before writing a single line of migration code.

### 2.1  Design Decisions (must be locked before Phase 0)

- **Light-only palette locked**
  - The shared theme now uses a light agricultural palette across `frontend/tailwind.config.js`, `frontend/src/globals.css`, and the shared hero/button system
  - CropGear now stays light-only, and new UI work should follow that direction
- [x] **Border radius**
  - Current Tailwind theme already uses `0.375rem`, `0.625rem`, `0.75rem`, and `1rem`
  - Decision made: keep that scale (no flatten to stricter shadcn default)
- [x] **Typography**
  - Current Tailwind theme uses `Inter`
  - Decision made: consolidate to Inter only; remove legacy multi-font imports during CSS cleanup
- [x] **Animation level**
  - Subtle transitions only; active in production (Tailwind transition utilities in use)
- [x] **Form architecture**
  - Decision locked: composable native forms with `Input` + `Label` (no react-hook-form adoption)

### 2.2  Environment & Tooling Readiness

- [x] **Node.js ≥ 18** installed and verified
- [x] Root `npm run dev` currently works without errors
- [x] Git working tree is clean – commit or stash all pending changes
- [x] Shadcn-migration branch can be created at any time

Current verification baseline already passes:

- ✅ `npm --prefix frontend run build` (verified 2026-03-27)
- ⏳ `npm --prefix frontend run test:run` (3 tests passing)
- ⏳ `npm --prefix frontend run lint` (lint configured, not yet run globally)

### 2.3  Backend API Alignment

- [x] All API endpoints the frontend consumes are **stable and documented**
- [x] No pending backend breaking changes
- [x] Backend CORS / proxy config supports dev server on `localhost:5173`
- [x] Confirm WebSocket endpoints (`/ws`) are stable (used by `Messages.jsx`)

### 2.4  Asset & Media Inventory

- [ ] Catalog all images/icons in `frontend/src/assets/` and `frontend/public/`
- [ ] Identify oversized images that should be optimized before migration
- [ ] Confirm `lucide-react` covers all icon needs â€” list any gaps that need custom SVGs
- [ ] Note any third-party assets loaded in `frontend/index.html`
- [ ] Audit Google Font imports currently pulled in through `frontend/src/index.css`

---

## 3  Pre-Migration Refactoring

> **Goal:** Break apart oversized files and fix structural issues *before* the styling migration, so each page is small enough to migrate cleanly.

### 3.1  Split Large Files

| File | Current Size | Action |
|---|---|---|
| `Messages.jsx` | ~40 KB (~1,000+ lines) | Split into `ChatSidebar.jsx`, `ChatThread.jsx`, `MessageBubble.jsx`, `ChatInput.jsx` |
| `ProfileSettings.jsx` | ~20 KB | Split into `ProfileForm.jsx`, `PasswordForm.jsx`, `AvatarUpload.jsx` |
| `BookingRequests.jsx` | ~19 KB | Split into `BookingTable.jsx`, `BookingFilters.jsx`, `BookingActions.jsx` |
| `AdminDashboard.jsx` | ~15 KB | Split into `DashStatCards.jsx`, `RecentActivity.jsx`, `QuickActions.jsx` |
| `VerifyOwners.jsx` | ~16 KB | Split into `OwnerTable.jsx`, `VerifyDialog.jsx`, `OwnerFilters.jsx` |

- [ ] Refactor the remaining files above into sub-components
- [ ] Ensure each new sub-component renders identically to the original (no visual changes yet)
- [ ] Run tests after each split to catch regressions
- [ ] Commit: `refactor(<Page>): split into sub-components for migration`

### 3.2  Normalize Import Paths

- [ ] Search for inconsistent import styles across `frontend/src/` (`../components/` vs `../../components/` vs alias imports)
- [ ] The `@/` alias already exists â€” batch-update remaining component imports to use `@/components/` and `@/lib/` where it improves readability
- [ ] Verify no circular imports exist

### 3.3  Extract Inline Styles Inventory

- [ ] Run a grep for `style={{` across all `frontend/src/` files
- [ ] Baseline count today: **56** inline-style occurrences
- [ ] Catalog the most common inline style patterns (these become Tailwind utility classes later)
- [ ] Document any dynamic/computed styles that cannot become static Tailwind classes (these will use `cn()` or `style` props)

---

## Workflow Analysis

- `App.jsx` keeps `Navbar`, `Footer`, route theming, auth, notifications, and the global toaster at the shell level, so page migrations should swap page internals first and only remove shell-level legacy pieces when the last consumers are ready.
- `Messages.jsx` and `BookingOperations.jsx` are shared cross-role workflows, which means UI decisions there affect farmer, owner, and admin routes at the same time.
- The new `ui/` primitives are currently concentrated in `StyleGuide.jsx`, `Docs.jsx`, and `Landing.jsx`, so the next meaningful adoption step should move real product workflows such as auth, booking, and moderation onto the same primitives.
- Legacy styling risk is concentrated in `frontend/src/index.css` and `frontend/src/premium-updates.css`; every migration slice should delete CSS in the same commit that removes its last consumer.

---

## 4  Migration Phases

### Phase 0 â€” Tooling Audit & Foundation Lock (Week 1â€“2)

> **Goal:** Stabilize the partially migrated frontend that already exists in the repo before broad page conversion begins.

#### Phase 0 checklist:

- [x] Shadcn baseline primitives added under `frontend/src/components/ui/`
- [x] Current `ui/` primitives audited: `alert`, `badge`, `button`, `card`, `dialog`, `input`, `label`, `separator`, `skeleton`, `textarea`
- [x] Existing `frontend/src/components/ui/dialog.jsx` confirmed as custom portal implementation (working well, no regeneration needed)
- [x] Form architecture decided: composable native forms (`Input` + `Label`), no react-hook-form adoption
- [x] CSS loading order verified: `globals.css` then `index.css` in `frontend/src/main.jsx`
- [x] Baseline primitives in use: `select`, `checkbox`, `tabs`, `sheet`, `navigation-menu`, `popover`, `command`, `table`, `dropdown-menu`, `tooltip`, `avatar` all present
- ✅ **Note:** `frontend/components.json` is present (repo is now reproducible for shadcn CLI usage)

**Phase 0 Exit Criteria: ✅ MET**
- ✅ Frontend has reproducible shadcn setup with all primitives audited
- ✅ Team has made explicit decisions on `dialog` and form architecture
- ✅ Design tokens and foundation are locked

### Phase 1 â€” Shared Primitives Swap (Week 3â€“4)

> **Goal:** Replace every custom shared component with its shadcn/ui equivalent, one at a time. Keep the old component file until all consumers are migrated, then delete it.

#### Swap order (dependency-aware):

```
1. badge   â†’  replaces Badge (from Card.jsx)
2. alert   â†’  replaces Alert (from Card.jsx)
3. card    â†’  replaces Card, CardHeader, CardBody, CardFooter (from Card.jsx)
4. input + label + textarea  â†’  replaces TextField, TextArea (from Form.jsx)
5. select  â†’  replaces Select (from Form.jsx)
6. checkbox â†’  replaces Checkbox (from Form.jsx)
7. form    â†’  optional; only introduce if Phase 0 chooses `react-hook-form` as the project standard
8. dialog  â†’  replaces Modal.jsx
9. skeleton â†’  replaces PageSkeleton.jsx, Loader.jsx
10. popover + command â†’  replaces SearchHistoryPanel.jsx
11. tabs   â†’  replaces tab patterns in AuthPortal.jsx
12. navigation-menu + sheet â†’  replaces Navbar.jsx
13. sidebar + sheet â†’  replaces DashboardShell.jsx
14. toggle  â†’  replaces FavoriteButton.jsx
15. avatar  â†’  for user profile displays
16. dropdown-menu â†’  for admin action menus
17. table   â†’  for admin data tables
18. tooltip â†’  for icon-only actions
```

#### Per-component swap process:

```
1. From `frontend/`, run `npx shadcn@latest add <component>` or regenerate the existing local primitive if it already exists
2. Customise the component's variants/theme in `frontend/src/components/ui/`
3. Update ONE consumer page to use the new component
4. Visual-diff old vs new (manual or screenshot)
5. Update ALL remaining consumers
6. Run existing tests (vitest run)
7. âš ï¸  DELETE the old component file â€” do NOT keep it "just in case"
8. âš ï¸  DELETE orphaned CSS classes from index.css / premium-updates.css
9. Verify no remaining imports reference the deleted file (grep the codebase)
10. Commit with message: "swap(<component>): migrate to shadcn/ui, remove old"
```

> [!IMPORTANT]
> **No coexistence:** The old and new component must never both exist after the commit. If a consumer is not ready to migrate, leave it on the old component â€” but once ALL consumers are moved, the old file is deleted in the same PR.

**Exit criteria:** Every import from `Card.jsx`, `Form.jsx`, `Modal.jsx`, `Loader.jsx`, `PageSkeleton.jsx`, `ActionFeedback.jsx`, and `SearchHistoryPanel.jsx` points to `frontend/src/components/ui/`, `sonner`, or updated composite components.

---

### Phase 2 â€” Page-Level Migration (Week 5â€“7)

> **Goal:** Migrate each page's inline styles and CSS-class-based layouts to Tailwind utility classes + shadcn primitives.

#### Migration groups (ordered by user impact):

**Group A â€” Auth & Onboarding (Week 5)**
- [x] `Login.jsx`, `FarmerLogin.jsx`, `OwnerLogin.jsx`, `AdminLogin.jsx`
- [x] `Register.jsx`
- [x] `ForgotPassword.jsx`, `ResetPassword.jsx`
- [x] `AuthPortal.jsx` â†’ shadcn `tabs` + `card`

**Group B â€” Public / Discovery (Week 5â€“6)**
- [x] `Home.jsx` (largest page â€” ~25 KB)
- [x] `Landing.jsx`
- [x] `SearchResults.jsx` (BrowseEquipment)
- [x] `EquipmentDetails.jsx`
- [x] `EquipmentCompare.jsx`
- [x] `BrowseEquipment.jsx`
- [x] `NotFound.jsx`
- [x] `Docs.jsx`

**Group C â€” Farmer Dashboard (Week 6)**
- [ ] `FarmerDashboard.jsx`
- [ ] `MyBookings.jsx`
- [ ] `MyReviews.jsx`
- [ ] `PaymentCheckout.jsx`
- [ ] `PaymentHistory.jsx`

**Group D â€” Owner Dashboard (Week 6)**
- [ ] `OwnerDashboard.jsx`
- [ ] `AddEquipment.jsx`
- [ ] `BookingRequests.jsx`
- [ ] `MyEquipment.jsx`
- [ ] `OwnerReviews.jsx`

**Group E â€” Admin Dashboard (Week 7)**
- [ ] `AdminDashboard.jsx`
- [ ] `AdminEquipment.jsx`
- [ ] `AdminReviews.jsx`
- [ ] `VerifyOwners.jsx`
- [ ] `Reports.jsx`
- [ ] `Newsletters.jsx`
- [ ] `TestimonialsAdmin.jsx`

**Group F â€” Account, Chat, and Shared Workflow (Week 7)**
- [ ] `ProfileSettings.jsx`
- [ ] `Messages.jsx` (~40 KB â€” largest single file)
- [ ] `BookingOperations.jsx`
- [ ] Keep `StyleGuide.jsx` updated as the living reference page for the migrated primitives

#### Per-page process:

```
1. Replace all inline `style={{}}` objects with Tailwind classes
2. Replace CSS class references (e.g. className="card") with shadcn components
3. âš ï¸  DELETE the page's custom CSS rules from index.css / premium-updates.css
4. âš ï¸  Grep for any remaining references to the deleted class names â€” fix or remove
5. Verify responsive behaviour at 375px, 768px, 1280px
6. Run vitest if tests exist for the page
7. Commit: "migrate(<PageName>): convert to Tailwind + shadcn, remove old CSS"
```

> [!IMPORTANT]
> After each page group is done, the CSS files should be measurably smaller. Track line counts to ensure dead CSS is actually removed, not just orphaned.

**Exit criteria:** No page imports styles from `index.css` or `premium-updates.css` via class names. All layout is Tailwind-driven.

---

### Phase 3 â€” Final CSS Cleanup & Deletion (Week 8)

> **Goal:** Delete all legacy CSS files entirely. By this point most rules should already be gone from Phase 1 & 2 removals â€” this phase catches any stragglers.

- [ ] Verify `frontend/src/index.css` has zero remaining custom rules (should only have Tailwind imports if it still exists at all)
- [ ] **Delete** `frontend/src/index.css` if fully empty, or reduce it to the smallest possible bridge file before deleting it
- [ ] **Delete** `frontend/src/premium-updates.css` entirely
- [ ] Run `rg "className" frontend/src/` and verify no references to deleted CSS classes remain
- [ ] **Delete** old component files if any slipped through Phase 1:
  - `Card.jsx`, `Modal.jsx`, `Form.jsx`, `Loader.jsx`, `PageSkeleton.jsx`, `ActionFeedback.jsx`, `SearchHistoryPanel.jsx`
- [ ] Remove `prop-types` dependency if all components are converted (or keep if desired)
- [ ] Run full `npm --prefix frontend run build` to verify tree-shaking and bundle size
- [ ] Run `npm --prefix frontend run lint` / `npm --prefix frontend run lint:fix`

**Exit criteria:** Zero orphaned CSS. Build succeeds. Lint is clean.

---

### Phase 4 â€” Quality & Polish (Week 8â€“9)

> **Goal:** Ensure the migrated app matches or exceeds the previous design quality.

- [ ] Full accessibility audit: keyboard nav, focus rings, ARIA, contrast ratios
- [ ] Responsive audit across all breakpoints
- [ ] Animation & micro-interaction pass (Tailwind `transition-*` / `animate-*`)
- [ ] Performance audit: bundle size comparison before vs after migration
- [ ] Update `StyleGuide.jsx` to showcase all shadcn primitives with CropGear theming
- [ ] Update/add tests for swapped components
- [ ] Update `README.md` with new component usage guidelines

**Exit criteria:** App is visually consistent, accessible, responsive, and performs equal-or-better vs the pre-migration state.

---

## 5  Component Mapping Reference

Quick-reference for developers during migration:

| Old Import | New Import |
|---|---|
| `import { Card, CardHeader, CardBody, CardFooter } from '../components/Card'` | `import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'` |
| `import { Badge } from '../components/Card'` | `import { Badge } from '@/components/ui/badge'` |
| `import { Alert } from '../components/Card'` | `import { Alert, AlertDescription } from '@/components/ui/alert'` |
| `import { TextField, TextArea, Select, Checkbox } from '../components/Form'` | `import { Input } from '@/components/ui/input'` + `import { Textarea } from '@/components/ui/textarea'` + `import { Select } from '@/components/ui/select'` + `import { Checkbox } from '@/components/ui/checkbox'` + `import { Label } from '@/components/ui/label'` |
| `import Modal from '../components/Modal'` | `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'` |
| `import PageSkeleton from '../components/PageSkeleton'` | `import { Skeleton } from '@/components/ui/skeleton'` |
| `import ActionFeedback from '../components/ActionFeedback'` | `import { toast, Toaster } from 'sonner'` |

---

## 6  Risk Register

| Risk | Mitigation |
|---|---|
| Tailwind bloats the bundle | Use Tailwind v4's automatic content detection; compare bundle before/after |
| Visual regressions during swap | Migrate one component at a time; visual-diff before deleting old code |
| Existing `dialog.jsx` diverges from the official shadcn/Radix behaviour | Decide in Phase 0 whether to keep the custom portal version or regenerate it before deeper adoption |
| `Form.jsx` replacement is underspecified | Do not add shadcn `form` until the team explicitly decides whether to adopt `react-hook-form` + `zod` |
| `prop-types` removal breaks runtime checks | Keep `prop-types` initially; remove only in Phase 3 if team agrees |
| Tests break on changed DOM structure | Update selectors in existing tests during Phase 1 |
| `Home.jsx` (25 KB) and `Messages.jsx` (40 KB) are massive | Allocate extra time; consider splitting into sub-components first |
| shadcn/ui version drift | Pin the `shadcn` CLI version in `package.json` scripts |
| Team unfamiliarity with Tailwind | Pair on the first 2â€“3 component swaps; link shadcn docs in PR templates |

---

## 7  Dependencies & Tooling Status

```bash
# Already present in frontend/package.json
# - tailwindcss
# - @tailwindcss/postcss
# - postcss
# - autoprefixer
# - class-variance-authority
# - clsx
# - tailwind-merge
# - lucide-react
# - sonner

# From frontend/, initialise reproducible shadcn metadata
npx shadcn@latest init

# Only if Phase 0 adopts shadcn form helpers
npm install react-hook-form zod @hookform/resolvers
```

Additional `@radix-ui/*` packages should be installed component-by-component as `select`, `checkbox`, `tabs`, `sheet`, `popover`, `command`, `navigation-menu`, `dropdown-menu`, `tooltip`, and `avatar` are added.

---

## 8  File Deletion Checklist

After all phases are complete, these files should be **deleted**:

| File | Reason |
|---|---|
| `frontend/src/components/Card.jsx` | Replaced by `frontend/src/components/ui/card.jsx` + `badge.jsx` + `alert.jsx` |
| `frontend/src/components/Modal.jsx` | Replaced by `frontend/src/components/ui/dialog.jsx` |
| `frontend/src/components/Form.jsx` | Replaced by `ui/input` + `ui/textarea` + `ui/select` + `ui/checkbox` + `ui/label` and optionally shadcn `form` if adopted |
| `frontend/src/components/Loader.jsx` | Replaced by `frontend/src/components/ui/skeleton.jsx` |
| `frontend/src/components/PageSkeleton.jsx` | Replaced by `frontend/src/components/ui/skeleton.jsx` |
| `frontend/src/components/ActionFeedback.jsx` | Replaced by `sonner` toasts |
| `frontend/src/components/SearchHistoryPanel.jsx` | Replaced by `ui/popover` + `ui/command` |
| `frontend/src/index.css` | All styles moved to Tailwind utilities + shadcn themes |
| `frontend/src/premium-updates.css` | Absorbed into Tailwind theme config |

---

## 9  Testing Strategy

### 9.1  Existing Test Maintenance

- [ ] Update `BookingCard.test.jsx` selectors after the `Card` + `Badge` + `Button` swap
- [ ] Update `bookings.test.js` if any utility signatures change
- [ ] `passwordPolicy.test.js` â€” pure logic, no UI changes expected

### 9.2  New Tests to Add During Migration

| Component / Page | Test Type | Priority |
|---|---|---|
| All shadcn `ui/` primitives | Render + variant snapshot tests | P1 |
| `Navbar.jsx` | Navigation, mobile menu toggle, active link | P1 |
| `DashboardShell.jsx` | Sidebar links, mobile nav, breadcrumb | P1 |
| Auth pages (Login, Register) | Form validation, submit, error states | P1 |
| `EquipmentCard.jsx` | Render with props, favorite toggle | P2 |
| `BookingCard.jsx` | Status badge variants, action buttons | P2 |
| `SearchResults.jsx` | Filter apply/reset, empty state | P2 |
| `Modal â†’ Dialog` | Open/close, focus trap, escape key | P2 |
| `Messages.jsx` sub-components | Message send, thread switch, typing indicator | P3 |
| Admin pages | Role guard, table render, action modals | P3 |

### 9.3  Visual Regression Testing (Optional but Recommended)

- [ ] Set up screenshot comparison for key pages (Home, Login, Farmer Dashboard, Equipment Detail)
- [ ] Run before and after each Phase 1 component swap
- [ ] Use browser dev tools or Playwright screenshots to capture at 375px, 768px, 1280px

### 9.4  Test Commands

```bash
# Run all frontend tests
npm --prefix frontend run test:run

# Run frontend tests in watch mode during development
npm --prefix frontend run test

# Run a specific test file
npx vitest run frontend/src/components/BookingCard.test.jsx

# Check build after migration changes
npm --prefix frontend run build
```

---

## 10  Git Branching & Deployment Plan

### 10.1  Branch Strategy

```
main (production)
 â””â”€â”€ feat/shadcn-migration (long-lived migration branch)
      â”œâ”€â”€ phase-0/tooling-setup
      â”œâ”€â”€ phase-1/swap-button
      â”œâ”€â”€ phase-1/swap-card
      â”œâ”€â”€ phase-1/swap-form
      â”œâ”€â”€ phase-1/swap-dialog
      â”œâ”€â”€ phase-1/swap-remaining
      â”œâ”€â”€ phase-2/auth-pages
      â”œâ”€â”€ phase-2/public-pages
      â”œâ”€â”€ phase-2/farmer-dashboard
      â”œâ”€â”€ phase-2/owner-dashboard
      â”œâ”€â”€ phase-2/admin-dashboard
      â”œâ”€â”€ phase-2/account-chat
      â”œâ”€â”€ phase-3/css-cleanup
      â””â”€â”€ phase-4/polish
```

### 10.2  Merge & Deploy Rules

- [ ] Each phase branch merges into `feat/shadcn-migration` via PR
- [ ] `feat/shadcn-migration` is rebased onto `main` weekly to avoid drift
- [ ] **Do not merge `feat/shadcn-migration` into `main` until Phase 3 is complete** â€” partial migrations create broken UIs
- [ ] Deploy from `feat/shadcn-migration` to a **staging environment** for review after each phase
- [ ] Final merge to `main` only after Phase 4 sign-off

### 10.3  Rollback Plan

- [ ] Keep `main` untouched until full migration is validated
- [ ] Tag `main` before the final merge: `git tag pre-shadcn-migration`
- [ ] If a critical issue is found post-merge: `git revert --no-commit HEAD` back to the tag
- [ ] Document any backend changes that depend on the new frontend (if any)

---

## 11  Full Timeline Summary

| Week | Phase | Key Deliverables |
|---|---|---|
| **Week 1** | Pre-requisites + Design decisions | Light-only palette locked, references collected, backend stable, environment verified |
| **Week 1â€“2** | Phase 0 â€” Tooling | Audit existing Tailwind/shadcn foundation, add `components.json`, and lock decisions on `dialog` and forms |
| **Week 2** | Pre-migration refactoring | Large files split into sub-components, import paths normalized |
| **Week 3â€“4** | Phase 1 â€” Primitives swap | Shared primitive swaps complete and old component files deleted as consumers move |
| **Week 5â€“6** | Phase 2Aâ€“D â€” Page migration | Auth, Public, Farmer, and Owner pages migrated to Tailwind + shadcn |
| **Week 7** | Phase 2Eâ€“F â€” Page migration | Admin, Account, Chat, and shared booking workflow pages migrated |
| **Week 8** | Phase 3 â€” CSS cleanup | All legacy CSS files deleted, build clean, lint clean |
| **Week 8â€“9** | Phase 4 â€” Polish | Accessibility, responsive audit, performance check, tests added |
| **Week 9** | **Final merge to `main`** | Production deploy |

---

## 12  Success Metrics

| Metric | Target |
|---|---|
| Custom CSS lines | **< 50** (from ~8,000+ today) |
| Shared component files in `frontend/src/components/` | Only composite/business components remain; all primitives live in `frontend/src/components/ui/` |
| Lighthouse Performance score | â‰¥ 90 |
| Lighthouse Accessibility score | â‰¥ 95 |
| Build time | No regression vs current |
| Bundle size | â‰¤ 10% increase (Tailwind tree-shakes aggressively) |
| Page count with inline `style={{}}` | **0** |
| Old component files remaining | **0** |
| Legacy CSS files remaining | **0** (`index.css`, `premium-updates.css`) |
| Test coverage (component-level) | â‰¥ 70% of `frontend/src/components/ui/` |
| All breakpoints pass visual check | 375px, 768px, 1280px |

---

## UI / UX Backlog

- [x] Complete Phase 0 decisions for `dialog` and forms.
- [x] Add the missing baseline primitives needed by live routes (`select`, `checkbox`, `tabs`, `sheet`, `navigation-menu`, `popover`, `command`, `table`, `dropdown-menu`, `tooltip`, `avatar`).
- [x] Migrate auth and public entry routes before the dashboard-heavy slices.
- [ ] Migrate the shared cross-role workflows (`Messages.jsx`, `BookingOperations.jsx`) after the largest files are split.
- [ ] Delete legacy CSS in lockstep with page and primitive swaps.

---

## 13  Immediate Next Sprint

**CURRENT STATUS (2026-03-27):** Phase 0 complete, Phase 1 complete for shared primitives + public discovery, Phase 2 C–F and Phase 3 cleanup remain.

### High-Priority Action Items (Next 2 Days)

1. **Finish Phase 1 component consumer migration:**
   - [x] Update `DashboardShell.jsx` to use `navigation-menu` + `sheet`
   - [x] Migrate `SearchHistoryPanel.jsx` consumers to `popover` + `command`
   - [x] Update `FavoriteButton.jsx` to `button` variant
   - [ ] Once all done: DELETE old component files (Card.jsx, Form.jsx, Modal.jsx, SearchHistoryPanel.jsx, etc.)
   - [x] Run: `npm --prefix frontend run build && npm --prefix frontend run lint`

2. **Start Phase 2 Auth Group (Group A) migrations:**
   - [x] Migrate `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx` to pure Tailwind + existing primitives
   - [ ] Remove legacy CSS classes from `index.css` for auth pages
   - [ ] Delete old CSS rules: grep, verify no references, commit cleanup

3. **Track CSS reduction:**
   - Start of Phase 1: ~6,891 lines in `index.css` + ~917 in `premium-updates.css` = **~7,808 total**
   - Target after Phase 1 completion: **< 5,000 lines**
   - Target after Phase 2: **< 2,000 lines**
   - Target after Phase 3: **< 100 lines** (stylesheet-only, no component CSS)

### If the team resumes this migration now, the highest-leverage sequence is:

1. Complete Phase 1 cleanup (finish consumers, delete old files) — 1-2 days
2. Execute Phase 2 Auth Group (A) — 2-3 days
3. Execute Phase 2 Public Discovery Group (B) including Home.jsx — 4-5 days
4. Parallel: Phase 2 Dashboard Groups (C, D, E) — 5-7 days
5. Phase 3 CSS cleanup and deletion — 1-2 days
6. Phase 4 Polish (A11y, responsive, performance) — 2-3 days
7. Final merge to `main` — 1 day

**Total realistic timeline: 2-3 weeks for full completion** (not 9 weeks if done in focused sprints with parallel work)
