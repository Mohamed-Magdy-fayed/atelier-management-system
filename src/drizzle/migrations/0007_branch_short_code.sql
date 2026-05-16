ALTER TABLE "branches" ADD COLUMN "shortCode" varchar(8);--> statement-breakpoint
UPDATE "branches" SET "shortCode" = CASE "nameEn"
  WHEN 'Main Branch' THEN 'MAIN'
  WHEN 'Cairo' THEN 'CAI'
  WHEN 'Alexandria' THEN 'ALX'
  WHEN 'Giza' THEN 'GIZ'
  WHEN 'Tanta' THEN 'TAN'
  WHEN 'Mansoura' THEN 'MNS'
  WHEN 'Assiut' THEN 'ASY'
  ELSE UPPER(LEFT(REGEXP_REPLACE("nameEn", '[^A-Za-z0-9]', '', 'g'), 4))
END
WHERE "shortCode" IS NULL;--> statement-breakpoint
UPDATE "branches" b SET "shortCode" = LEFT(b."shortCode", 6) || SUBSTRING(b."id"::text FROM 1 FOR 2)
WHERE b."id" IN (
  SELECT "id" FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "shortCode" ORDER BY "createdAt", "id") AS rn
    FROM "branches"
  ) d WHERE d.rn > 1
);--> statement-breakpoint
ALTER TABLE "branches" ALTER COLUMN "shortCode" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "branches_short_code_idx" ON "branches" USING btree ("shortCode");
