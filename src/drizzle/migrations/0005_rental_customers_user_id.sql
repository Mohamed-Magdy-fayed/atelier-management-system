ALTER TABLE "rental_customers" ADD COLUMN "userId" uuid;--> statement-breakpoint
ALTER TABLE "rental_customers" ADD CONSTRAINT "rental_customers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rental_customers_user_id_idx" ON "rental_customers" USING btree ("userId");
