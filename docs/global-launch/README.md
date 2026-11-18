# Selling abroad: managed installs (phase 1)

Each client runs their own deployment against their own database. This page is
the per-client checklist. The multi-tenant conversion (`docs/multi-tenant/`)
starts only after three shops are paying.

## 1. Regional defaults (env, per deployment)

| Variable | Default | Effect |
|---|---|---|
| `NEXT_PUBLIC_CURRENCY` | `USD` | ISO 4217 code used for every amount, receipt and WhatsApp message |
| `NEXT_PUBLIC_REGION` | `US` | One of `US GB CA AU AE SA EG`. Sets number and date locale, default phone country, default calling code for numbers typed without one, payment methods and minimum deposit |

- `NEXT_PUBLIC_*` values are baked in at build time: change them, then redeploy.
- Egyptian install: `NEXT_PUBLIC_CURRENCY=EGP`, `NEXT_PUBLIC_REGION=EG`. This reproduces the old behaviour (100 minimum deposit, Instapay and wallet methods, `ar-EG` digits).
- Arabic outside Egypt uses `ar-AE`, which shows Western digits.
- Whole-unit money only: KWD and BHD (3 decimals) are not supported.
- Minimum deposit is 20 in non-EGP installs (`src/lib/locale-config.ts`).
- Payment methods offered: EG installs get cash, Instapay, mobile wallet, Visa. Everything else gets cash, card, bank transfer, PayPal. Old payment rows keep their method.

Known limitation: the customer-dedup key (`rental_customer_phone_key`, migration 0011) strips an Egyptian `20` prefix. US, UK and Gulf numbers are not affected because they are stored with their own country code, but a bare 10-digit number starting `20` would be misread. Revisit in the multi-tenant phase.

## 2. Branding per client

Set the name, logo and colour in Settings (codes `00009`–`00012`). Auth emails and the passkey prompt now use that name.

## 3. Billing: Polar payment links (no code)

Lemon Squeezy is closed to new sign-ups and shuts down on 2027-03-31, so it is not used. Polar is the merchant of record and pays out to Egypt.

1. Create the Polar account and complete payout (Stripe Connect Express) onboarding. Confirm in the Polar dashboard that your Egyptian payout account is accepted before quoting a customer.
2. Create one subscription product per plan, priced in USD.
3. Send the customer the product's checkout link.
4. Record `client, plan, paid until, deployment URL` in your tracking sheet. Suspend a deployment by pausing its Vercel project when a subscription lapses.
5. Automation (webhooks, plan gating) is deferred to the multi-tenant phase.

## 4. Legal pages

`/terms` and `/privacy` are public, bilingual and use the client's brand name. The text lives in `src/features/public-catalog/lib/legal-content.ts`. **It is a template: have a lawyer review it for each client's jurisdiction before launch.** Linked from the public footer.

## 5. Backups

- Primary: Neon point-in-time restore (check the retention window of the client's Neon plan).
- Secondary: `DATABASE_URL=... ./scripts/backup-db.sh` writes a `pg_dump` file. Needs `pg_dump` 17.
- Before a client goes live: take a dump, restore it into a scratch Neon branch with `pg_restore`, and open the app against it. Write the date in the tracking sheet.

## 6. New-client checklist

1. New Neon project, Vercel project, `<slug>.<domain>` (see `docs/client-demos/PLAN.md` for the demo version of this flow).
2. Env: database, Redis, Google OAuth redirect URI, `JWT_SECRET_KEY`, `SETTINGS_ENCRYPTION_KEY`, Firebase/Cloudinary, SMTP, `NEXT_PUBLIC_CURRENCY`, `NEXT_PUBLIC_REGION`, `BRANDING_EDITABLE`.
3. `npm run vercel-build` runs migrations (including `0020`, which adds the card, bank transfer and PayPal payment methods).
4. Set branding and WhatsApp mode in Settings. Prefer `own` or `off` until the WhatsApp provider's terms are confirmed.
5. Take a backup and test the restore.
6. Send the Polar link.
