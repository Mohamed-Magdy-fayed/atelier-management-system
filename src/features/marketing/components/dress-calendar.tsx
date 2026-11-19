import type { MarketingCopy, MarketingLocale } from "../content";

const DAYS = 14;
const digits = (n: number, locale: MarketingLocale) =>
  locale === "ar" ? n.toLocaleString("ar-EG") : String(n);

/**
 * The hero picture: one dress, two weeks, two brides, one day they both want.
 * Pure CSS grid so it renders on the server, scales to any width and flips with
 * `dir`. It shows the product's single promise instead of a stock photo.
 */
export function DressCalendar({
  copy,
  locale,
}: {
  copy: MarketingCopy["calendar"];
  locale: MarketingLocale;
}) {
  // Day numbers, 1-based. Bride 1: 3-6. Bride 2 wants 6-9; day 6 is the clash.
  const a = { from: 3, to: 6 };
  const b = { from: 6, to: 9 };
  const clashDay = 6;
  return (
    <figure className="mk-card relative mx-auto w-full max-w-xl overflow-hidden rounded-[1.75rem] p-5 sm:p-7">
      <figcaption className="mb-4 grid gap-1">
        <span className="mk-display text-lg">{copy.dressLabel}</span>
        <span className="text-xs mk-muted">{copy.caption}</span>
      </figcaption>

      <div
        className="grid gap-y-2"
        style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {Array.from({ length: DAYS }, (_, i) => (
          <div
            className="mk-muted pb-1 text-center text-[0.7rem] tabular-nums"
            key={`d${i + 1}`}
          >
            {digits(i + 1, locale)}
          </div>
        ))}

        <Bar from={a.from} to={a.to} tone="ink" row={2} />
        <Bar from={b.from} to={b.to} tone="gold" row={3} />
        <div
          className="mk-clash rounded-md"
          style={{ gridColumn: clashDay, gridRow: "2 / 4" }}
        />
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-[var(--mk-ink)]" />
          {copy.legendA}
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-[var(--mk-gold)]" />
          {copy.legendB}
        </li>
        <li className="flex items-center gap-2">
          <span className="mk-clash size-2.5 rounded-sm" />
          {copy.clash}
        </li>
      </ul>

      <p className="mt-5 rounded-xl border border-[var(--mk-line)] bg-[var(--mk-bg)] px-4 py-3 text-sm leading-relaxed">
        <span className="me-2 inline-block rounded-full bg-[var(--mk-ink)] px-2 py-0.5 text-[0.7rem] text-[var(--mk-bg)]">
          ✓
        </span>
        {copy.fixed}
      </p>
    </figure>
  );
}

function Bar({
  from,
  to,
  tone,
  row,
}: {
  from: number;
  to: number;
  tone: "ink" | "gold";
  row: number;
}) {
  return (
    <div
      className={
        tone === "ink"
          ? "h-7 rounded-md bg-[var(--mk-ink)]"
          : "h-7 rounded-md bg-[var(--mk-gold)]"
      }
      style={{ gridColumn: `${from} / ${to + 1}`, gridRow: row }}
    />
  );
}
