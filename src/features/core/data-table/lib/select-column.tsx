"use client";

import type { ColumnDef, Table } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

function SelectAllHeader<T>({ table }: { table: Table<T> }) {
  const some = table.getIsSomePageRowsSelected();
  const all = table.getIsAllPageRowsSelected();

  return (
    <Checkbox
      checked={all}
      indeterminate={some && !all}
      onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
      aria-label="Select all on page"
    />
  );
}

export function createSelectColumn<T>(): ColumnDef<T> {
  return {
    id: "select",
    size: 40,
    enablePinning: true,
    enableHiding: false,
    enableSorting: false,
    header: ({ table }) => <SelectAllHeader table={table} />,
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked)}
        aria-label="Select row"
      />
    ),
  };
}
