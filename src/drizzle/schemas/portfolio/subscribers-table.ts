import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { id } from "@/drizzle/schemas/helpers";

export const subscriberStatusValues = ["active", "unsubscribed"] as const;
export type SubscriberStatus = (typeof subscriberStatusValues)[number];
export const subscriberStatusEnum = pgEnum(
  "subscriber_status",
  subscriberStatusValues,
);

export const SubscribersTable = pgTable(
  "subscribers",
  {
    id,
    email: varchar({ length: 256 }).notNull().unique(),
    status: subscriberStatusEnum().notNull().default("active"),
    confirmedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("subscribers_status_idx").on(table.status),
    index("subscribers_email_idx").on(table.email),
  ],
);

export type Subscriber = typeof SubscribersTable.$inferSelect;
export type NewSubscriber = typeof SubscribersTable.$inferInsert;
