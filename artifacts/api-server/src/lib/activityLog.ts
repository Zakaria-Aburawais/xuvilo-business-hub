import { db, activityEventsTable } from "@workspace/db";
import { logger } from "./logger";

export interface LogActivityArgs {
  userId: string;
  type: string;
  title: string;
  description?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert an event into the user's activity feed. Failures are logged but
 * never thrown — activity logging must not break primary flows.
 */
export async function logActivity(args: LogActivityArgs): Promise<void> {
  try {
    await db.insert(activityEventsTable).values({
      userId: args.userId,
      type: args.type.slice(0, 64),
      title: args.title.slice(0, 500),
      description: args.description ?? "",
      linkedEntityType: args.linkedEntityType ?? "",
      linkedEntityId: args.linkedEntityId ?? "",
      clientId: args.clientId ?? "",
      metadata: args.metadata ?? {},
    });
  } catch (err) {
    logger.warn({ err, type: args.type }, "logActivity failed");
  }
}
