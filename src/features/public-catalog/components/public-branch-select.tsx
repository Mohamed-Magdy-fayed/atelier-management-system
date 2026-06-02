"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_BRANCHES = "__all__";

export type PublicBranchOption = {
  id: string;
  label: string;
};

export function PublicBranchSelect({
  branches,
  value,
  onValueChange,
  allLabel,
  triggerClassName,
  id,
}: {
  branches: PublicBranchOption[];
  value: string | undefined;
  onValueChange: (branchId: string | undefined) => void;
  allLabel: string;
  triggerClassName?: string;
  id?: string;
}) {
  const selectValue = value && value.length > 0 ? value : ALL_BRANCHES;

  return (
    <Select
      value={selectValue}
      onValueChange={(next) => {
        const v = next as string;
        onValueChange(v === ALL_BRANCHES ? undefined : v);
      }}
    >
      <SelectTrigger className={triggerClassName ?? "w-full"} id={id}>
        <SelectValue placeholder={allLabel}>
          {(val) => {
            if (val === ALL_BRANCHES || val == null) return allLabel;
            return branches.find((b) => b.id === val)?.label ?? allLabel;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_BRANCHES}>{allLabel}</SelectItem>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
