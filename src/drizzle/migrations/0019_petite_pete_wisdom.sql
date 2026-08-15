CREATE TABLE "user_screen_permissions" (
	"userId" uuid NOT NULL,
	"screenKey" varchar(64) NOT NULL,
	"canView" boolean DEFAULT false NOT NULL,
	"canCreate" boolean DEFAULT false NOT NULL,
	"canUpdate" boolean DEFAULT false NOT NULL,
	"canDelete" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone,
	CONSTRAINT "user_screen_permissions_userId_screenKey_pk" PRIMARY KEY("userId","screenKey")
);
--> statement-breakpoint
ALTER TABLE "user_screen_permissions" ADD CONSTRAINT "user_screen_permissions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_screen_permissions_user_idx" ON "user_screen_permissions" USING btree ("userId");