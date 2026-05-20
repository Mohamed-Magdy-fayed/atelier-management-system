<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## App conventions

- **Admin entities and CRUD**: follow [`docs/entity-blueprint.md`](docs/entity-blueprint.md) (intake questions, registry, server layout, table modes, **Form Pattern** and **Overlay forms** for modal/sheet forms).

## Agent workflow (required)

Always follow [`.cursor/rules/agent-workflow.mdc`](.cursor/rules/agent-workflow.mdc). In short:

- Run **`npm run build`** after substantive changes; fix type/build errors before finishing.
- Use normal file edits, not ad-hoc shell scripts, for source patches.
- Keep system screens aligned with the entity blueprint and registry (`EntityPageHeader`, audit-only info dialogs, selection/action bar rules).
- **When you discover a repeatable mistake or convention, document it in `agent-workflow.mdc`** (and here or the blueprint when appropriate) so future sessions follow it.
- **Inline form/system notices**: use shadcn `Alert` with the proper variant (`default` vs `destructive`); see agent-workflow **UI feedback (shadcn)**.
