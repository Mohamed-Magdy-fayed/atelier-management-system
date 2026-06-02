CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"nameEn" varchar(128) NOT NULL,
	"nameAr" varchar(128) NOT NULL,
	"price" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdBy" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedBy" varchar,
	"updatedAt" timestamp with time zone,
	"deletedBy" varchar,
	"deletedAt" timestamp with time zone
);
