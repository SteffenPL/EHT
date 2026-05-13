---
name: visual-html-communication
description: "Use when a response would be clearer as a self-contained visual HTML artifact instead of Markdown: plans, reviews, comparisons, diagrams, reports, explainers, prototypes, or small editors."
---

# Visual HTML Communication

When Markdown would become a wall of text, create a single self-contained `.html` file the user can open directly.

Use HTML especially for:
- Side-by-side options, trade-offs, timelines, flows, maps, dashboards, annotated diffs, diagrams, slide decks, interactive explainers, and tiny editors.
- Work where layout, color, motion, filtering, toggles, collapsible sections, or export buttons make the idea easier to understand.

Rules:
- Keep it one file: inline CSS and JS, no build step unless the user asks.
- Lead with the useful artifact, not prose about the artifact.
- Design for scanning: clear hierarchy, compact sections, labels, tables, cards only for repeated items.
- Make the artifact interactive only when interaction improves judgment or feedback.
- Include source/context notes inside the page when facts, files, commits, or decisions matter.
- End with an obvious way to act: recommendation, next steps, copy/export button, or links into relevant files.

Default location: save artifacts under `docs/html/` with a short kebab-case name.
