import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { LinkButton } from "@/components/general/link-button";
import { db } from "@/drizzle";
import { UsersTable } from "@/drizzle/schema";
import { getCurrentUser } from "@/features/core/auth/nextjs/currentUser";

export const metadata = {
  title: "My Account",
};

export default async function MyAccountPage() {
  const session = await getCurrentUser({ redirectIfNotFound: true });

  if (session.role !== "customer") {
    redirect("/dashboard");
  }

  const user = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.id, session.id),
    columns: { id: true, name: true, email: true },
  });

  return (
    <section className="py-20">
      <div className="container mx-auto max-w-3xl px-4 md:px-8">
        <h1 className="text-3xl font-bold">
          Welcome back{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-2">
          Your account is active. We'll be in touch about any inquiries you've
          submitted.
        </p>

        <div className="mt-8 rounded-xl border p-8">
          <p className="text-muted-foreground mb-4">
            Have a new business challenge you'd like us to look at?
          </p>
          <LinkButton href="/contact">Submit a New Inquiry</LinkButton>
        </div>
      </div>
    </section>
  );
}
