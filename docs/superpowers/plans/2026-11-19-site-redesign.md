# Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the site into a French portfolio: the five projects on the home page, a fixed navigation, one project-page template with an architecture diagram each, and the weather dashboard as a demo under `/demo`.

**Architecture:** Mock-ups in Claude Design come first and gate all code. One metadata module (`src/lib/portfolio.ts`) feeds the navigation, home page, skills grid and previous / next links. Diagrams are server-rendered SVG components on the shared primitives of `src/components/docs/diagram.tsx`.

**Tech Stack:** Next.js 16.4 App Router (Cache Components), React 19, Tailwind 4, vitest; Claude Design (Artifact "Design" type) for the mock-ups; gstack `/browse` for screenshots.

**Spec:** `docs/superpowers/specs/2026-11-19-site-redesign-design.md`

## Global Constraints

- Read `dashboard/node_modules/next/dist/docs/` for any Next API used (routing, redirects, metadata, `Link`), as `dashboard/AGENTS.md` requires.
- Server components by default; client components only for the dashboard (as today), the table of contents' highlight and, if CSS cannot do it, the phone menu.
- Colours only from the tokens in `src/app/globals.css` (light and dark); no new runtime dependency.
- Site text in French; code, comments, commits in English; GitHub READMEs in English.
- URLs `/projets/<slug>` and `/projets/glossaire` unchanged; `/projets` → `/#projets`; `/towns/<code>` → `/demo/<code>`; permanent redirects.
- Project order everywhere: `antilles-data-pipeline`, `caribbean-sensor-pipeline`, `caribbean-ais-stream`, `antilles-climate-lakehouse`, `antilles-hurricane-warehouse` (families: Batch, IoT, Temps réel, Lakehouse, Entrepôt cloud).
- Header: "Tom Tesson" + "Data engineer"; GitHub link (`https://github.com/tomtessondev`); no e-mail.
- Before every commit, in `dashboard/`: `npm run lint && npm run typecheck && npm test && npm run build`; at the repository root: `make check` and `make transform`.
- Two pull requests (shell + home + demo; project template + diagrams), each merged only after the owner reviews its Vercel preview.
- Never use `mcp__claude-in-chrome__*`; browser work goes through gstack `/browse`.

## Review Focus

1. Phone width (375 px): the navigation menu opens, lists the five projects, and closes; no horizontal page scroll on any page.
2. Old links: `/towns/<code>` and `/projets` land on the new pages (permanent redirect), and `/projets/<slug>#<section>` anchors are not hidden under the fixed header.
3. Dark mode: every diagram's boxes, labels and arrows stay readable (token colours only).
4. Keyboard: the "Projets" menu and the table of contents are reachable and usable with Tab / Enter, with a visible focus.
5. A project added to `portfolio.ts` without a page, or a skill row nobody fills, fails the tests rather than rendering a dead link or an empty row.

Tests: 2 → `src/lib/redirects.test.ts` (Task 3); 5 → `src/lib/portfolio.test.ts` (Task 2); 1, 3, 4 → the screenshot and keyboard checks of Tasks 5 and 8.

---

### Task 1: Mock-ups in Claude Design (gate)

**Files:** none in the repository; the Claude Design artifact link goes into the ledger.

- [ ] **Step 1:** `Artifact` with `action: "quickstart"`, `intent: "design"`; create the design from the Design type it names (title "Portfolio Antilles — refonte").
- [ ] **Step 2:** Draft three screens with the real content, using the site's palette (tokens of `globals.css`, light and dark) and system sans / mono type:
  - **Accueil**: header (name, "Data engineer", navigation); hero (who, five projects on real Antilles data); overview diagram of the five projects (family, sources, main technologies, shared links: same islands, Open-Meteo ×2, dbt ×2, Terraform ×2); skills grid (rows: Ingestion, Modélisation, Streaming, Orchestration, Infrastructure as code, Tests, Maîtrise des coûts, Sécurité, Cloud; columns: the five projects; each filled cell a two-to-four-word proof, drawn only from the project pages); five project cards (`#projets`).
  - **Page projet** (with `antilles-hurricane-warehouse` content): architecture diagram at the top; side table of contents; "En bref" box (problème, résultat, technologies, dépôt, documentation, démo); sections; previous / next.
  - **Navigation**: desktop with the "Projets" menu open; phone (375 px) closed and open.
- [ ] **Step 3: Owner approval.** Send the link; apply requested changes in the design; repeat until the owner approves. Ledger: link, approval, and every content cell of the skills grid and "En bref" boxes as approved. **No code before this line.**

### Task 2: Portfolio metadata

**Files:**
- Create: `dashboard/src/lib/portfolio.ts`, `dashboard/src/lib/portfolio.test.ts`

**Interfaces — produces:**
```ts
export type Skill = "ingestion" | "modelling" | "streaming" | "orchestration" | "iac" | "tests" | "cost" | "security" | "cloud";
export type Project = {
  slug: string; family: string; title: string; pitch: string; clientValue: string;
  problem: string; result: string; stack: string[];
  skills: Partial<Record<Skill, string>>;   // cell text = the proof shown in the grid
  repo: string; docs?: string; demo?: string;
};
export const SKILL_LABELS: Record<Skill, string>;
export const PROJECTS: readonly Project[];
export function projectBySlug(slug: string): Project;           // throws on an unknown slug
export function neighbours(slug: string): { previous: Project | null; next: Project | null };
```

- [ ] **Step 1: failing tests** in `portfolio.test.ts`:
  - `projects are in portfolio order` → slugs equal the Global Constraints order.
  - `every project has its page` → `existsSync(src/app/projets/<slug>/page.tsx)` for each.
  - `every skill row is filled by at least one project` and `every project proves at least three skills`.
  - `neighbours walk the order` → first has `previous: null`, last has `next: null`, middle ones link both ways.
  - `projectBySlug rejects an unknown slug` → throws.
- [ ] **Step 2:** `npm test -- portfolio` → FAIL (module missing).
- [ ] **Step 3:** implement with the content approved in Task 1 (titles, pitches, client value, problem / result, stack, skill cells, links: repos `https://github.com/tomtessondev/<slug>`, docs for batch and warehouse, demo `/demo` for batch).
- [ ] **Step 4:** `npm test -- portfolio` → PASS.
- [ ] **Step 5:** commit "Describe the five projects in one module".

### Task 3: Site shell, navigation, redirects

**Files:**
- Create: `dashboard/src/components/site/site-nav.tsx`, `dashboard/src/components/site/site-footer.tsx`, `dashboard/src/lib/redirects.ts`, `dashboard/src/lib/redirects.test.ts`
- Modify: `dashboard/src/app/layout.tsx`, `dashboard/next.config.ts`, `dashboard/src/app/globals.css` (scroll-padding for the fixed header)

**Interfaces — produces:** `export const REDIRECTS: { source: string; destination: string; permanent: true }[]` (consumed by `next.config.ts`); `<SiteNav />`, `<SiteFooter />` (no props, read `PROJECTS`).

- [ ] **Step 1: failing test** `redirects.test.ts`: `/projets` → `/#projets`; `/towns/:code` → `/demo/:code`; all permanent; no source equals `/projets/:slug`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement `redirects.ts`; `next.config.ts` `redirects()` returns it.
- [ ] **Step 4:** `SiteNav` (approved change): a vertical sidebar on the left (264 px, fixed while the page scrolls): name + "Data engineer · Antilles" linking to `/`, "Vue d’ensemble", "Projets" with the five from `PROJECTS` (colour, family, repo name, current one marked), "Explorer": Démo météo, Glossaire; GitHub at the bottom. Below 1024 px: a top bar whose "Menu" `<details>` opens the same list (no client JS); visible focus styles. `SiteFooter`: data credits (French), GitHub. Layout: `<html lang="fr">`, title default "Tom Tesson — data engineer, portfolio Antilles", template "%s · Tom Tesson", French description; `html { scroll-padding-top }` equal to the header height.
- [ ] **Step 5:** run the four dashboard checks → PASS; commit "Give the site a portfolio shell and navigation".

### Task 4: The dashboard becomes the demo, in French

**Files:**
- Move: `src/app/page.tsx` → `src/app/demo/page.tsx`; `src/app/towns/[code]/page.tsx` → `src/app/demo/[code]/page.tsx`
- Create: `dashboard/src/lib/routes.ts` (+ test)
- Modify: `src/components/{town-map,ranking,dust-calendar,explorer,town-view,charts,comparison-chart,pm10-status,segmented}.tsx`, `src/lib/measures.ts` (labels) and its test if it asserts labels; `antilles-data-pipeline/README.md`, `dashboard/README.md` (live dashboard links → `/demo`)

**Interfaces — produces:** `export function townHref(code: string): string` → `/demo/<code>`; every internal town link uses it.

- [ ] **Step 1: failing test** `routes.test.ts`: `townHref("97101")` is `/demo/97101`. Run → FAIL; implement; PASS.
- [ ] **Step 2:** move the two routes, replace hard-coded `/towns/` links with `townHref`, back link of the town page → `/demo`.
- [ ] **Step 3:** translate every visible string (headings, legends, tooltips, units text, "No complete day…", dates in `fr-FR`), keeping data keys unchanged; update tests that assert labels.
- [ ] **Step 4:** checks → PASS; commit "Move the weather dashboard to /demo, in French".

### Task 5: Home page, then pull request 1

**Files:**
- Create: `src/app/page.tsx` (portfolio), `src/components/portfolio/{overview-diagram,skills-grid,project-cards}.tsx`
- Delete: `src/app/projets/page.tsx` (the redirect replaces it)
- Modify: `src/app/projets/glossaire/page.tsx` (link back to `/`), the portfolio root `README.md` (outside Git: dashboard link → `/demo`)

- [ ] **Step 1:** build the page as approved in Task 1: hero, `OverviewDiagram` (on `Diagram` primitives), `SkillsGrid` (a `<table>` with row and column headers, scrolls sideways on phones), `ProjectCards` (`id="projets"`).
- [ ] **Step 2:** checks + `make check` + `make transform` → PASS; commit "Make the portfolio the home page".
- [ ] **Step 3:** `next build && next start`, `/browse` screenshots at 1280 and 375 px, light and dark, of `/`, `/demo`, a town page, `/projets/glossaire`; open the menu at 375 px; Tab through the navigation; follow `/projets` and `/towns/97101`. Fix and re-check until clean.
- [ ] **Step 4: owner approval** → push branch `feat/site-shell`, open PR 1, CI green, send the Vercel preview link; merge on the owner's go.

### Task 6: Project page template

**Files:**
- Create: `src/components/project/{project-layout,brief,toc,prev-next}.tsx` (`toc.tsx` is the only client component: highlights the section in view)
- Modify: `src/components/docs/diagram.tsx` (add what the five diagrams need: groups / lanes, labelled edges, legend), keeping its token colours

**Interfaces — produces:**
```ts
<ProjectLayout slug={string} sections={[id: string, title: string][]} diagram={ReactNode}>{children}</ProjectLayout>
```
renders: title and pitch from `projectBySlug`, the diagram, the side table of contents (top on phones), the `Brief` box, the children, `PrevNext` from `neighbours`.

- [ ] **Step 1:** implement; migrate `antilles-hurricane-warehouse/page.tsx` onto it with its architecture diagram (raw → staging → intermediate → marts, loaders, GitHub Actions, BigQuery).
- [ ] **Step 2:** checks → PASS; screenshot the page at 1280 / 375, light / dark; compare with the approved mock-up; commit "Add the project page template".

### Task 7: The four other project pages and their diagrams

**Files:** `src/app/projets/{antilles-data-pipeline,caribbean-sensor-pipeline,caribbean-ais-stream,antilles-climate-lakehouse}/page.tsx`; diagrams in each page's `_components/` on the shared primitives; delete the bespoke primitives (`caribbean-sensor-pipeline/_components/diagram.tsx`, `caribbean-ais-stream/_components/diagram.tsx`) once unused; `traffic-map.tsx` and `partitions.tsx` keep their drawing and only switch to shared colours.

- [ ] **Step 1:** one page at a time: `ProjectLayout`, its top architecture diagram, its existing box-and-arrow diagrams moved onto the primitives, text unchanged in substance; checks after each page, one commit per page ("Move the <slug> page onto the template").
- [ ] **Step 2:** `prose.tsx` moves from `caribbean-sensor-pipeline/_components/` to `src/components/project/` (it is shared by every page); imports updated; commit.

### Task 8: Final checks, then pull request 2

- [ ] **Step 1:** `/browse` on every page at 1280 / 375, light / dark: no horizontal scroll, diagrams readable, `#section` anchors land below the header, keyboard through the menu and the table of contents; fix until clean.
- [ ] **Step 2:** checks + `make check` + `make transform`; push `feat/project-template`, PR 2, CI green, Vercel preview to the owner; merge on the owner's go.
- [ ] **Step 3:** portfolio root `CLAUDE.md` / `README.md`: the site is the portfolio, the dashboard is at `/demo`.
