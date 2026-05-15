import { LinkButton } from "@/components/general/link-button";
import { Lead, Muted } from "@/components/ui/typography";
import { getLocaleCookie, getT } from "@/features/core/i18n/server";
import { PublicCatalogFilters } from "@/features/public-catalog/components/public-catalog-filters";
import { normalizePublicDressSort } from "@/features/public-catalog/lib/public-dress-sort";
import { PublicDressCard } from "@/features/public-catalog/components/public-dress-card";
import {
  listPublicBranches,
  listPublicDresses,
} from "@/features/public-catalog/server/queries";

type Props = {
  searchParams: Promise<{
    branchId?: string;
    search?: string;
    page?: string;
    sort?: string;
  }>;
};

export default async function PublicBrowsePage({ searchParams }: Props) {
  const sp = await searchParams;
  const { t } = await getT();
  const locale = await getLocaleCookie();

  const page = Math.max(Number.parseInt(sp.page ?? "1", 10) || 1, 1);
  const branchId = sp.branchId?.trim() || undefined;
  const search = sp.search?.trim() || undefined;
  const sort = normalizePublicDressSort(sp.sort);

  const [branches, catalog] = await Promise.all([
    listPublicBranches(),
    listPublicDresses({ branchId, search, page, perPage: 24, sort }),
  ]);

  const branchOptions = branches.map((b) => ({
    id: b.id,
    label: locale === "ar" ? b.nameAr : b.nameEn,
  }));

  const labels = {
    perDay: t("publicCatalog.perDay"),
    branchSection: t("publicCatalog.branchSectionTitle"),
  };

  const filterLabels = {
    searchPlaceholder: t("publicCatalog.searchPlaceholder"),
    filterBranch: t("publicCatalog.filterBranch"),
    filterBranchAll: t("publicCatalog.filterBranchAll"),
    sortBy: t("publicCatalog.sortBy"),
    sortPopularity: t("publicCatalog.sortPopularity"),
    sortPriceAsc: t("publicCatalog.sortPriceAsc"),
    sortPriceDesc: t("publicCatalog.sortPriceDesc"),
    sortTitleAsc: t("publicCatalog.sortTitleAsc"),
    sortNewest: t("publicCatalog.sortNewest"),
    applyFilters: t("publicCatalog.applyFilters"),
    clear: t("common.clear"),
  };

  function qs(
    next: Partial<{
      branchId: string;
      search: string;
      page: string;
      sort: string;
    }>,
  ) {
    const p = new URLSearchParams();
    const merged = { branchId, search, sort, ...next };
    if (merged.branchId) p.set("branchId", merged.branchId);
    if (merged.search) p.set("search", merged.search);
    if (merged.sort && merged.sort !== "popularity") p.set("sort", merged.sort);
    if (merged.page && merged.page !== "1") p.set("page", merged.page);
    const q = p.toString();
    return q ? `?${q}` : "";
  }

  const prevPage = Math.max(page - 1, 1);
  const nextPage = Math.min(page + 1, catalog.pageCount);

  return (
    <main className="border-t border-border/60 bg-muted/10">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <header className="mb-10 space-y-3">
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
            {t("publicCatalog.title")}
          </h1>
          <Lead className="max-w-2xl text-muted-foreground">
            {t("publicCatalog.lead")}
          </Lead>
          <Muted className="block max-w-2xl text-xs leading-relaxed">
            {t("publicCatalog.staffOnlyNotice")}
          </Muted>
        </header>

        <PublicCatalogFilters
          branchId={branchId}
          branches={branchOptions}
          labels={filterLabels}
          search={search}
          sort={sort}
        />

        {catalog.rows.length === 0 ? (
          <p className="text-muted-foreground">{t("publicCatalog.empty")}</p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {catalog.rows.map((dress) => (
                <PublicDressCard
                  dress={dress}
                  key={dress.id}
                  labels={labels}
                  locale={locale}
                />
              ))}
            </div>
            <nav
              aria-label="Pagination"
              className="mt-12 flex flex-wrap items-center justify-center gap-3"
            >
              <LinkButton
                aria-disabled={page <= 1}
                className={
                  page <= 1 ? "pointer-events-none opacity-40" : undefined
                }
                href={
                  page <= 1 ? "#" : `/browse${qs({ page: String(prevPage) })}`
                }
                variant="outline"
              >
                {t("common.back")}
              </LinkButton>
              <span className="text-muted-foreground text-sm tabular-nums">
                {page} / {catalog.pageCount}
              </span>
              <LinkButton
                aria-disabled={page >= catalog.pageCount}
                className={
                  page >= catalog.pageCount
                    ? "pointer-events-none opacity-40"
                    : undefined
                }
                href={
                  page >= catalog.pageCount
                    ? "#"
                    : `/browse${qs({ page: String(nextPage) })}`
                }
                variant="outline"
              >
                {t("common.next")}
              </LinkButton>
            </nav>
          </>
        )}
      </div>
    </main>
  );
}
