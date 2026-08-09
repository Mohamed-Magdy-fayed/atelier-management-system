-- Custom SQL migration file, put your code below! --

-- Data migration: create the WhatsApp sender settings rows.
--
-- Settings are rows, not schema, so they normally arrive via
-- `npm run seed -- settings`. That is a manual step nobody runs on a deploy, so
-- a release carrying new settings would ship code that reads rows which do not
-- exist yet. Creating them here means they land with the deploy that needs them.
--
-- ON CONFLICT DO NOTHING is what makes this safe to re-run and safe to apply to
-- an environment that has already been seeded: an existing row keeps whatever
-- value the owner has set, and this migration never overwrites a credential.
--
-- `createdBy` matches SEED_SYSTEM_ACTOR in src/drizzle/seed/constants.ts, so
-- rows created here are indistinguishable from seeded ones.

INSERT INTO "settings" ("code", "label", "description", "isActive", "value", "amount", "createdBy")
VALUES (
  '00006',
  'integration',
  'How customer WhatsApp messages are sent. off: nothing is sent at all. platform: sent from the shared Gateling Atelier number, with a Gateling Atelier line appended. own: sent from this atelier''s own number using the instance id and API token below, with no added branding.',
  NULL,
  'platform',
  NULL,
  'system:seed'
)
ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint

INSERT INTO "settings" ("code", "label", "description", "isActive", "value", "amount", "createdBy")
VALUES (
  '00007',
  'integration',
  'Wapilot instance id for this atelier''s own WhatsApp number. Only used when the sending mode is own.',
  NULL,
  NULL,
  NULL,
  'system:seed'
)
ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint

INSERT INTO "settings" ("code", "label", "description", "isActive", "value", "amount", "createdBy")
VALUES (
  '00008',
  'integration',
  'Wapilot API token paired with the instance id above. Stored encrypted and never shown again after saving. Only used when the sending mode is own.',
  NULL,
  NULL,
  NULL,
  'system:seed'
)
ON CONFLICT ("code") DO NOTHING;
