# Site redesign: the portfolio as the home page

## Intent

The site at https://antilles-data-pipeline.vercel.app was the batch project's weather
dashboard, with the portfolio documentation added later under `/projets`. The owner wants
the whole site redesigned so that a visitor (a recruiter or a prospective client of a
freelance data engineer) lands on the portfolio, moves easily between the five projects,
and understands what was built in each and how the projects relate. Diagrams carry the
explanation; the look must be professional and easy to use. The visual design is drafted
in Claude Design and approved by the owner before any code is written.

## Goals

- **Home page = the portfolio** (`/`): who the owner is (an FPGA / embedded engineer turned
  data engineer, five complete projects on real data from the French Antilles), an overview
  diagram of the five projects (family, data sources, main technologies, and what they
  share: the same islands, Open-Meteo in two projects, dbt in two, Terraform in two), a
  skills grid (projects as columns; ingestion, modelling, streaming, orchestration,
  infrastructure as code, tests, cost control, security, cloud as rows), and the five
  project cards.
- **A fixed navigation bar on every page**: overview, a "Projets" menu listing the five
  projects with their family, the weather demo, the glossary, GitHub. On phones it folds
  into a menu.
- **One template for the five project pages**: an architecture diagram at the top in a
  single visual style shared by all five; a side table of contents that follows the
  reading; an "en bref" box (problem, result, technologies, repository and docs links,
  demo if any); "projet précédent / suivant" links at the bottom, in the portfolio order
  (batch, IoT, temps réel, lakehouse, entrepôt cloud).
- **The weather dashboard becomes the batch project's demo** at `/demo` (and its town pages
  under `/demo/<code>`), unchanged in function, with the new navigation.
- **Everything in French**, including the dashboard's labels. Code, comments and commits
  stay in English (repository rule); the GitHub READMEs stay in English.

## Non-goals

- Rewriting the projects' content: the texts of the five pages keep their substance; they
  move into the new template and get their diagram.
- An English version, a CMS, a blog, analytics, a contact form.
- Changes to the data pipeline, the export contract (`src/lib/schema.ts`) or the charts'
  behaviour.

## Anti-goals

- A generic template look (stock hero, gradients, icons everywhere).
- Pages that need much JavaScript in the browser: server components by default, client
  components only where interaction requires it (the dashboard as today, the menu on
  phones if it cannot be done in CSS, the table of contents' current-section highlight).
- Broken links: the READMEs of the five repositories and the dbt docs link to
  `/projets/<slug>` and to `/`; those URLs keep working.
- Diagrams unreadable on a phone or in dark mode.

## Constraints

- Next.js 16.4 App Router (read `node_modules/next/dist/docs/` before writing code, as
  `dashboard/AGENTS.md` requires), React 19, Tailwind 4, the existing colour tokens in
  `globals.css` (light and dark themes); no new runtime dependency unless the plan justifies
  it.
- Checks before every commit: `npm run lint && npm run typecheck && npm test && npm run
  build` in `dashboard/`, plus `make check` and `make transform` at the repository root.
- Deployed on Vercel from `main`; a pull request gets a preview deployment, which the
  owner reviews before merge.
- The repository's rule: the French documentation of all five projects lives in
  `dashboard/src/app/projets/`.

## Approaches

1. **Mock-ups in Claude Design, then code** (chosen by the owner). Three screens drafted
   in Claude Design: the home page (overview diagram, skills grid, cards), the project
   page template (architecture diagram, side contents, "en bref" box, previous / next) and
   the navigation bar (desktop and phone). The owner approves or asks for changes, then the
   screens are built in the existing Next.js app. Costs a step before code, so the owner
   judges the design before thirty files change.
2. Several generated directions (gstack `/design-shotgun`), then code: images rather than
   editable mock-ups, less consistent across ten pages.
3. Straight to code, iterating on screenshots: fastest, but the owner sees the design only
   once built, against the request to use Claude Design.

Diagrams: hand-built SVG React components rendered on the server, in one shared style
(extending `src/components/docs/diagram.tsx`, which already uses the site's tokens), rather
than Mermaid or React Flow (generic rendering, browser JavaScript, a style that clashes).
The bespoke diagram parts of the sensor and AIS pages move onto the shared primitives.

## Decided

- Scope: the whole site; the portfolio is the home page (owner).
- Language: French throughout the site (owner).
- Navigation, home sections and project template as described in Goals (owner approved the
  outline).
- Option 1: Claude Design mock-ups approved by the owner before code (owner).

## My calls (the owner can correct them)

- **One source for the projects' metadata** (`src/lib/portfolio.ts`: order, slug, family,
  one-line pitch, client value, stack, skills, repository, docs and demo links). The
  navigation, the home cards, the skills grid and previous / next all read it, and a test
  checks that every slug has its page and that the grid has no empty row.
- **URLs**: `/` becomes the portfolio; `/projets` redirects to `/#projets`; `/projets/<slug>`
  and `/projets/glossaire` stay; the dashboard moves to `/demo` and its town pages from
  `/towns/<code>` to `/demo/<code>`, with permanent redirects from the old paths.
- **Identity**: the header shows the owner's name with "Data engineer"; the home page links
  to GitHub only. No e-mail address on the site.
- **Site title and description** change from "Antilles weather & air quality" to the
  portfolio's.
- **The mock-ups follow the site's current tokens** (palette, light and dark), so the
  approved design can be built without a new colour system; the mock-ups may propose type
  scale, spacing and layout changes.
- **The mock-ups come first and gate everything.** None exist yet: the first step drafts the
  three screens in Claude Design with the real content, and nothing is coded until the
  owner approves them.
- **Content of the skills grid and "en bref" boxes**: drafted from the existing project
  pages (no claim that a page does not support), shown with their real text in the
  mock-ups, so the owner reviews the content and the design in the same approval.
- **Diagrams in scope**: one top architecture diagram per project, all five on the shared
  primitives, plus the home overview diagram. The other in-page diagrams of the sensor,
  AIS and batch pages are moved onto the same primitives where they are box-and-arrow
  diagrams; the AIS traffic map and partition figure keep their own drawing and only take
  the shared colours.
- **Links elsewhere**: the "live dashboard" links in `antilles-data-pipeline/README.md`,
  `dashboard/README.md` and the portfolio root `README.md` point to `/demo`, and the site
  gains a link back to the portfolio from those READMEs' wording ("portfolio and demo").
- **Every preview is coherent.** Two pull requests: (1) the shell, navigation, home page,
  demo move with its French labels, `lang="fr"` and the new title, so the site is French
  and portfolio-first from the first merge; (2) the project page template and the
  diagrams. Each gets its Vercel preview and the owner's go before merge.

## Left to the builder

- The exact layout of the overview diagram and of each architecture diagram, within the
  approved mock-ups.
- How the side table of contents highlights the current section (CSS or a small client
  component).
- The French wording of the dashboard's labels.

## Approved mock-ups (2026-11-19)

Claude Design canvas https://claude.ai/artifact/37ZhebPvmSHE4LGVWaAMsQ, approved by the owner
with one change he asked for: **the navigation is a vertical sidebar on the left** (name,
"Vue d'ensemble", the five projects always listed with their family colour, "Explorer": demo
and glossary, GitHub at the bottom), fixed while the page scrolls. On a project page the
table of contents and the "En bref" box sit in a column to the right of the text. On
phones a top bar with a "Menu" button opens the same list. The skills grid has eleven rows
(adds "Qualité des données" and "Supervision"), its cells as drawn on the canvas.
