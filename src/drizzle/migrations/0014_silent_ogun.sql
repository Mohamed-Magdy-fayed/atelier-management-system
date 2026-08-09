CREATE TYPE "public"."import_job_source" AS ENUM('csv');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('uploaded', 'validating', 'review', 'committing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."import_row_action" AS ENUM('create', 'update', 'skip');--> statement-breakpoint
CREATE TYPE "public"."import_row_status" AS ENUM('valid', 'invalid', 'done', 'skipped');--> statement-breakpoint
CREATE TABLE "import_job_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"rowNumber" integer NOT NULL,
	"status" "import_row_status" NOT NULL,
	"action" "import_row_action" DEFAULT 'skip' NOT NULL,
	"reasons" text[] DEFAULT '{}' NOT NULL,
	"values" jsonb NOT NULL,
	"targetId" uuid
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitySlug" varchar(64) NOT NULL,
	"source" "import_job_source" DEFAULT 'csv' NOT NULL,
	"branchId" uuid,
	"locale" varchar(8) DEFAULT 'en' NOT NULL,
	"status" "import_job_status" DEFAULT 'uploaded' NOT NULL,
	"fileName" text NOT NULL,
	"rawCsv" text NOT NULL,
	"totalRows" integer DEFAULT 0 NOT NULL,
	"processedRows" integer DEFAULT 0 NOT NULL,
	"validRows" integer DEFAULT 0 NOT NULL,
	"invalidRows" integer DEFAULT 0 NOT NULL,
	"committedRows" integer DEFAULT 0 NOT NULL,
	"ignoredColumns" text[],
	"errorMessage" text,
	"startedAt" timestamp with time zone,
	"finishedAt" timestamp with time zone,
	"createdBy" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedBy" varchar,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "import_job_rows" ADD CONSTRAINT "import_job_rows_jobId_import_jobs_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_job_rows_job_id_row_number_idx" ON "import_job_rows" USING btree ("jobId","rowNumber");--> statement-breakpoint
CREATE INDEX "import_job_rows_job_id_status_idx" ON "import_job_rows" USING btree ("jobId","status");--> statement-breakpoint
CREATE INDEX "import_jobs_created_by_idx" ON "import_jobs" USING btree ("createdBy","createdAt");--> statement-breakpoint
CREATE INDEX "import_jobs_entity_slug_idx" ON "import_jobs" USING btree ("entitySlug");