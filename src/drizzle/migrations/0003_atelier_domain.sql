DROP TABLE IF EXISTS "products" CASCADE;--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('reserved', 'pickedUp', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('deposit', 'finalPayment', 'penalty', 'insurance');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('instapay', 'mobileWallet', 'visa', 'cash');--> statement-breakpoint
CREATE TYPE "public"."settings_label" AS ENUM('policy', 'integration');--> statement-breakpoint
CREATE TABLE "dresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branchId" uuid NOT NULL,
	"code" varchar(128) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"images" text[],
	"size" varchar(64),
	"color" varchar(64),
	"pricePerDay" integer NOT NULL,
	"depositAmount" integer NOT NULL,
	"insurance" integer NOT NULL,
	"timesRented" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdBy" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedBy" varchar,
	"updatedAt" timestamp with time zone,
	"deletedBy" varchar,
	"deletedAt" timestamp with time zone,
	CONSTRAINT "dresses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "rental_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branchId" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"reservationsCount" integer DEFAULT 0 NOT NULL,
	"note" text,
	"lastReservationAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rental_customers_branch_phone_unique" UNIQUE("branchId","phone")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branchId" uuid NOT NULL,
	"dressId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"reservationCode" varchar(128) NOT NULL,
	"customerName" varchar(255) NOT NULL,
	"customerPhone" varchar(32),
	"receivingDateTime" timestamp with time zone NOT NULL,
	"occasionDate" timestamp with time zone NOT NULL,
	"returnDateTime" timestamp with time zone NOT NULL,
	"totalPrice" integer NOT NULL,
	"insurance" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"depositPaid" integer DEFAULT 0 NOT NULL,
	"totalPaid" integer DEFAULT 0 NOT NULL,
	"status" "reservation_status" DEFAULT 'reserved' NOT NULL,
	"notes" text,
	"createdBy" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedBy" varchar,
	"updatedAt" timestamp with time zone,
	"deletedBy" varchar,
	"deletedAt" timestamp with time zone,
	CONSTRAINT "reservations_reservationCode_unique" UNIQUE("reservationCode")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branchId" uuid NOT NULL,
	"reservationId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"amount" integer NOT NULL,
	"type" "payment_type" NOT NULL,
	"method" "payment_method" NOT NULL,
	"note" text,
	"createdBy" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(128) NOT NULL,
	"label" "settings_label" NOT NULL,
	"description" text,
	"isActive" boolean,
	"value" text,
	"amount" integer,
	"createdBy" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedBy" varchar,
	"updatedAt" timestamp with time zone,
	CONSTRAINT "settings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "dresses" ADD CONSTRAINT "dresses_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_customers" ADD CONSTRAINT "rental_customers_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_dressId_dresses_id_fk" FOREIGN KEY ("dressId") REFERENCES "public"."dresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customerId_rental_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."rental_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_branchId_branches_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservationId_reservations_id_fk" FOREIGN KEY ("reservationId") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_rental_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."rental_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dresses_branch_id_idx" ON "dresses" USING btree ("branchId");--> statement-breakpoint
CREATE INDEX "rental_customers_branch_id_idx" ON "rental_customers" USING btree ("branchId");--> statement-breakpoint
CREATE INDEX "reservations_branch_id_idx" ON "reservations" USING btree ("branchId");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reservations_dress_id_idx" ON "reservations" USING btree ("dressId");--> statement-breakpoint
CREATE INDEX "reservations_customer_id_idx" ON "reservations" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "reservations_code_idx" ON "reservations" USING btree ("reservationCode");--> statement-breakpoint
CREATE INDEX "settings_code_idx" ON "settings" USING btree ("code");
