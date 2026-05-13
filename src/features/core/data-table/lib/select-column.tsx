"use client";

import type { ColumnDef, Table } from "@tanstack/react-table";
import { useEffect, useRef } from "react";

function SelectAllHeader<T>({ table }: { table: Table<T> }) {
  const ref = useRef<HTMLInputElement>(null);
  const some = table.getIsSomePageRowsSelected();
  const all = table.getIsAllPageRowsSelected();
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some && !all;
  }, [some, all]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="size-3.5 rounded border border-input accent-primary"
      checked={all}
      onChange={table.getToggleAllPageRowsSelectedHandler()}
      aria-label="Select all on page"
    />
  );
}

export function createSelectColumn<T>(): ColumnDef<T> {
  return {
    id: "select",
    size: 40,
    enablePinning: false,
    enableHiding: false,
    enableSorting: false,
    header: ({ table }) => <SelectAllHeader table={table} />,
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="size-3.5 rounded border border-input accent-primary"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        aria-label="Select row"
      />
    ),
  };
}
