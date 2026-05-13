# Import Review Guidance

- Keep this feature standalone. Do not pull parsing or dialog state from `features/core/data-table`.
- `t(...)` and `ctx.t(...)` are already typed as `string`. Never wrap them in `String(...)`.
- Keep the UI simple: file row, filters, table, footer.
- Use one `ScrollArea` for the dialog body.
- Let only the preview table wrapper handle horizontal overflow.
- Prefer small adapters like `UsersImportButton` over embedding server-specific logic in the generic dialog.
