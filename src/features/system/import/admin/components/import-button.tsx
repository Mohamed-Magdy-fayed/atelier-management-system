"use client";

import { UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/features/core/i18n/client";

import type { ImportEntitySlug } from "../../specs";
import { ImportDialog } from "./import-dialog";

/** Toolbar entry point, sized to match the other grid icon buttons. */
export function ImportButton({ entitySlug }: { entitySlug: ImportEntitySlug }) {
  const { t } = useTranslation();

  return (
    <Tooltip>
      <ImportDialog
        entitySlug={entitySlug}
        trigger={
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                type="button"
                className="size-8"
                aria-label={t("dataTable.importCsv")}
              >
                <UploadIcon className="size-3.5" />
              </Button>
            }
          />
        }
      />
      <TooltipContent>{t("dataTable.importCsv")}</TooltipContent>
    </Tooltip>
  );
}
