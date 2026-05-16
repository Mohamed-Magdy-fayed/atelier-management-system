"use client";

import { H2, Lead } from "@/components/ui/typography";
import { useTranslation } from "@/features/core/i18n/client";
import { getEntityRegistryItem } from "@/features/system/registry";

type EntityPageHeaderProps = {
  slug: string;
};

export function EntityPageHeader({ slug }: EntityPageHeaderProps) {
  const { t } = useTranslation();
  const entity = getEntityRegistryItem(slug);

  if (!entity) return null;

  return (
    <div className="space-y-1">
      <H2>{String(t(`systemPages.${entity.titleKey}`))}</H2>
      <Lead>{String(t(`systemPages.${entity.leadKey}`))}</Lead>
    </div>
  );
}
