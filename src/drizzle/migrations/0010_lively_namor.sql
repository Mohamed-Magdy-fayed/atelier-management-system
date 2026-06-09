CREATE TYPE "public"."dress_current_status" AS ENUM('available', 'atTailor', 'atDryCleaner', 'underRepair');--> statement-breakpoint
CREATE TYPE "public"."expense_type" AS ENUM('drycleaning', 'tailoring', 'dressAcquisition', 'salary', 'custom');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branchId" uuid NOT NULL,
	"type" "expense_type" NOT NULL,
	"amount" integer NOT NULL,
	"dressId" uuid,
	"employeeId" uuid,
	"description" text NOT NULL,
	"note" text,
	"date" date NOT NULL,
	"createdBy" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedBy" varchar,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "dresses" ADD COLUMN "currentStatus" "dress_current_status" DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_dressId_dresses_id_fk" FOREIGN KEY ("dressId") REFERENCES "public"."dresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_employeeId_users_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;