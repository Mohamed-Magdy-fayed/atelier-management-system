# Import Review

Reusable CSV import-review flow for client screens.

## What It Provides

- CSV file parsing inside the feature, with no dependency on `data-table`
- A generic `ImportReviewDialog` that any screen can hook to any trigger button
- A current `UsersImportButton` adapter for the users router
- A simple mobile-first layout:
  - file picker row
  - status filters
  - preview table
  - commit / cancel footer

## Design Rules

- Do not wrap `t(...)` or `ctx.t(...)` with `String(...)`. The i18n helpers already return `string`.
- Keep the dialog body simple. Use one `ScrollArea` for the dialog body.
- Only the preview table wrapper should handle horizontal overflow.
- Keep this feature standalone. Do not import parsing or UI state from `features/core/data-table`.

## Generic Usage

```tsx
import { Button } from "@/components/ui/button";
import {
  ImportReviewDialog,
  type ImportReviewColumn,
  type ImportReviewRow,
} from "@/features/core/import-review";

type ProductImportRow = ImportReviewRow & {
  sku: string;
  name: string;
};

const columns: ImportReviewColumn<ProductImportRow>[] = [
  { id: "row", header: "#", cell: (row) => row.rowNumber },
  { id: "name", header: "Name", cell: (row) => row.name },
];

<ImportReviewDialog
  trigger={<Button variant="outline">Import</Button>}
  columns={columns}
  previewFile={async (file) => {
    return myPreviewMutation(file);
  }}
  commitFile={async ({ file, reviewRows, rowsToCommit }) => {
    return myCommitMutation({ file, reviewRows, rowsToCommit });
  }}
/>;
```

## Current Users Adapter

Use `UsersImportButton` when importing customers or employees:

```tsx
import { UsersImportButton } from "@/features/core/import-review";

<UsersImportButton role="customer" />;
<UsersImportButton role="employee" />;
```

The adapter handles:

- `users.previewImport`
- `users.commitImport`
- row merging after commit
- invalidating `trpc.users.pathKey()`
