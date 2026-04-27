# OpenMiami / LogosImpact / Sustainacities — Org Map

**Purpose of this document:** a plain-English picture of what currently exists
across your GitHub orgs, where the overlaps and gaps are, and what to do
about each piece — written so you don't need a developer next to you to make
sense of it.

**How this was built:** by reading the *public* pages of your two GitHub orgs
(`LogosImpact` and `Sustainacities`) on April 26, 2026. Anything private, on
contributors' personal accounts, or off-GitHub is invisible to this map until
you fill it in (see the questions at the end).

**What this is NOT:** the consolidation itself. This is the map. The
consolidation (folder structure, schema, MiaGPT package, API routes, docs,
seed data, issues) happens in the next session, *after* you've answered the
questions at the bottom and we've corrected the map.

---

## 1. The big picture, in one paragraph

You appear to operate two related GitHub organizations: **`LogosImpact`** —
the foundation/civic-tech arm, almost entirely empty publicly, with one
fresh repo (`OpenMiami_OSS`) that is intended to become the umbrella for
your community-facing tools — and **`Sustainacities`** — the older
climate/smart-city arm, which holds your earlier work (`SaveMiami`, `MIAGPT`,
`NFTrees`) plus a collection of forked open-source tools you've pulled in for
reference. Outside GitHub there is also **`Logos Capital`**, which I have no
visibility into and which may or may not have any digital footprint to map
(see Question 3 at the bottom). The plan going forward is to use
`LogosImpact/OpenMiami_OSS` as the new home for **MiamiVerse**,
**LHRT-finder**, and **MiaGPT**, while deciding case-by-case what to do with
the existing Sustainacities repos that overlap.

---

## 2. Each org at a glance

### `github.com/LogosImpact`

| Repo | What it does (one sentence) | Status | Recommended action |
|---|---|---|---|
| `OpenMiami_OSS` | Intended umbrella for civic-tech tools (MiamiVerse, LHRT-finder, MiaGPT). | Empty / fresh | **Fill it** with the consolidated structure (next session). |

> Note: this org has no public members visible and no other public repos.
> If there are private repos, please list them in Question 4.

### `github.com/Sustainacities`

| Repo | What it does (one sentence) | Status | Recommended action |
|---|---|---|---|
| `SaveMiami` | Original repo; "Sustainable Smart City Project to #SaveMiami" — the climate-resilience kickoff. | Active (we're in it now) | **Keep** as historical/climate-resilience repo. The current branch is being used as a staging area for OpenMiami consolidation; that's a one-time use, not a long-term home. |
| `MIAGPT` | Original repo; multilingual chat assistant (Nunjucks-based). | Original — overlaps with planned `OpenMiami_OSS/packages/miagpt/` | **Decision needed** — see §4 (the MIAGPT conflict). |
| `NFTrees` | Original repo; NFT protocol for environmental initiatives. | Original | **Confirm with you** — keep, archive, or move. Not part of OpenMiami scope. |
| `Flowise` | Drag-and-drop UI for building LLM workflows. | Fork (upstream is FlowiseAI) | **Archive or delete the fork** — forks you're not actively modifying just clutter the org page. The upstream is one click away. |
| `ClimateGPT` | Climate-focused LLM (English + Arabic). | Fork | Same as above — archive/delete unless you've made changes. |
| `earth2studio` | NVIDIA's AI weather/climate framework. | Fork | Same as above. |
| `klab` | Natural-capital and ecosystem-services modeling. | Fork | Same as above. |
| `data-market` | Data marketplace platform. | Fork | Same as above. |
| `cameratrapai` | Wildlife species classification with AI. | Fork | Same as above. |
| `IsaacSim` | Robotics simulation on NVIDIA Omniverse. | Fork | Same as above. |
| `home-assistant` | Open-source home automation platform. | Fork | Same as above. |
| `ODM` | Drone mapping and 3D model generation. | Fork | Same as above. |

> **Pattern:** 9 of your 12 public repos are forks you don't appear to be
> actively modifying. They make the org look busier than it is and bury your
> three real projects (`SaveMiami`, `MIAGPT`, `NFTrees`). One easy
> housekeeping win is to archive or delete the unused forks.

### `Logos Capital`

Not visible on GitHub publicly. See Question 3.

### Hackathon repos under contributor personal accounts

I have no URLs for these yet. See Question 1. Placeholder rows:

| Repo (URL needed) | Likely role | Action |
|---|---|---|
| (URL needed) | MiamiVerse hackathon front-end | Move into `OpenMiami_OSS/apps/miamiverse/` |
| (URL needed) | LHRT-finder hackathon (Netlify team) | Move into `OpenMiami_OSS/apps/lhrt-finder/` |
| (URL needed, if any third) | TBD | TBD |

---

## 3. Where OpenMiami fits

The plan, in plain English:

- **`LogosImpact/OpenMiami_OSS`** becomes the *one place* a contributor goes
  to find civic-tech code for Miami.
- Inside it, the **`apps/`** folder holds the user-facing things people open
  in a browser:
  - `miamiverse/` — the MiamiVerse site
  - `lhrt-finder/` — the Little Haiti Revitalization Trust resource finder
- **`api/`** holds the backend routes (the part that talks to the database).
  This will be deployed to `api.openmiami.org` later.
- **`db/`** holds the database setup files for Supabase (the schema and the
  starter records).
- **`packages/miagpt/`** holds the chat assistant code (Claude API wrapper,
  multilingual prompts).
- **`packages/languages/`** holds the translation files (English, Kreyòl,
  Spanish, French).
- **`docs/`** holds the human-readable explanations.

What this means for what you already have:

- **`Sustainacities/SaveMiami`** stays where it is, as the original climate
  repo. OpenMiami is a *different* product (a civic-resource directory), not
  a replacement.
- **`Sustainacities/MIAGPT`** has a naming conflict with the planned
  `OpenMiami_OSS/packages/miagpt/`. We have to decide what to do — see the
  next section.
- **`Sustainacities/NFTrees`** is unrelated to OpenMiami and stays put unless
  you tell me otherwise.

---

## 4. The MIAGPT naming conflict — DECIDED: Option B (parallel)

**Decision:** Keep `Sustainacities/MIAGPT` as the older, sustainability-focused
version, and build `OpenMiami_OSS/packages/miagpt/` as the new
civic-resource version. Different audiences, different prompts, no
disruption to anything currently running.

**What this means in practice (for the next session):**

- The consolidation session will create a brand-new `packages/miagpt/`
  inside `OpenMiami_OSS`. It will **not** touch, copy from, or migrate the
  existing `Sustainacities/MIAGPT`.
- To prevent contributor confusion (the main downside of running two), each
  repo's `README` should clearly say what it's for, who uses it, and how
  it's *different* from the other. Concretely:
  - `Sustainacities/MIAGPT` README → "Sustainability/climate chat assistant.
    For [audience]. Not the same project as `OpenMiami_OSS/packages/miagpt/`,
    which is the civic-resource finder for Little Haiti / Miami residents."
  - `OpenMiami_OSS/packages/miagpt/` README → mirror image of the above,
    pointing the other direction.
- Different naming inside each codebase helps too: keep `MIAGPT` as the
  capitalization for the Sustainacities one, and use `MiaGPT` (one capital)
  for the OpenMiami one. Small thing, but it shows up in import statements
  and folder listings and reduces "wait, which one is this?" moments.

This is captured here so the next session doesn't have to re-litigate the
decision.

---

## 5. What I still need from you

Answer these in any order, whenever you've got a minute. I'll fold the
answers into this map in one update pass before we start the consolidation.

1. **Hackathon repo URLs.** Paste the 2 or 3 URLs for the MiamiVerse
   hackathon repo, the LHRT-finder hackathon repo, and any third. Even if
   they live on someone's personal GitHub (e.g., `github.com/their-name/repo`),
   that's fine.
2. ~~**MIAGPT decision.** A, B, or C from §4 above?~~ **ANSWERED: B (parallel).** See §4.
3. **Logos Capital.** Is it a digital project (website, app, code) or just a
   business entity? If digital, where does it live? If not, we leave it off
   the map.
4. **Private repos.** Are there private repos in either `LogosImpact` or
   `Sustainacities` I should know about? Names + one-sentence descriptions
   is plenty — I won't try to access them.
5. **Non-GitHub assets to map.** Anything else worth putting on the picture?
   Examples: Vercel projects, Netlify sites, the Supabase project at
   `api.openmiami.org`, domain registrations, Google Drive folders, Notion
   workspaces, the `MiaGPT` chat (if it's already deployed somewhere).
6. **People.** Should this map include contributor names and roles, or stay
   strictly about code/projects? Either is fine.

---

## 6. Recommended next session

Once §5 is answered:

1. I update this map in one pass with your answers.
2. We restart in a session that has write access to `LogosImpact/OpenMiami_OSS`
   (or you give me copy-paste commands to land things there manually).
3. We do the original 8-task consolidation, **corrected by what this map
   revealed** — meaning: we don't blindly create `packages/miagpt/` if you
   pick Option A or C in §4, we don't create empty `apps/miamiverse/` and
   `apps/lhrt-finder/` until you've shared their hackathon source, and we
   archive the unused Sustainacities forks as part of the cleanup.

That's the map. Read it through, answer what you can, and we go from there.
