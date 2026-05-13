"use client";

import { EditIcon, ListStartIcon, Plus, Trash2 } from "lucide-react";
import type { ReactElement } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/features/core/i18n/client";
import { useIsMobile } from "@/hooks/use-mobile";

import type { EditableBranch } from "./types";

type BranchManagerDropdownProps = {
  branches: EditableBranch[];
  canManageBranches: boolean;
  isPending: boolean;
  locale: string;
  onCreateBranch: () => void;
  onDeleteBranch: (branch: EditableBranch) => void;
  onEditBranch: (branch: EditableBranch) => void;
  onSetActiveBranch: (branchId: string) => void;
  trigger: ReactElement;
};

export function BranchManagerDropdown({
  branches,
  canManageBranches,
  isPending,
  locale,
  onCreateBranch,
  onDeleteBranch,
  onEditBranch,
  onSetActiveBranch,
  trigger,
}: BranchManagerDropdownProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent
        align="start"
        side={isMobile ? "bottom" : "right"}
        sideOffset={4}
        className="w-fit"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {t("authTranslations.branch.create.title")}
          </DropdownMenuLabel>
          {branches.length === 0 ? (
            <DropdownMenuItem disabled>
              {t("authTranslations.branch.switcher.empty")}
            </DropdownMenuItem>
          ) : null}
          {branches.map((branch) => (
            <DropdownMenuSub key={branch.id}>
              <DropdownMenuSubTrigger>
                <div className="flex-1 truncate">
                  {locale === "ar" ? branch.nameAr : branch.nameEn}
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent alignOffset={-4} sideOffset={6}>
                <DropdownMenuItem
                  disabled={isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    onSetActiveBranch(branch.id);
                  }}
                >
                  <ListStartIcon />
                  {t("authTranslations.branch.switcher.setActive")}
                </DropdownMenuItem>
                {canManageBranches ? (
                  <>
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.preventDefault();
                        onEditBranch(branch);
                      }}
                    >
                      <EditIcon />
                      {t("authTranslations.branch.switcher.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.preventDefault();
                        onDeleteBranch(branch);
                      }}
                      variant="destructive"
                    >
                      <Trash2 />
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
        </DropdownMenuGroup>
        {canManageBranches ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(event) => {
                event.preventDefault();
                onCreateBranch();
              }}
            >
              <Plus className="size-4" />
              {t("authTranslations.branch.switcher.add")}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
