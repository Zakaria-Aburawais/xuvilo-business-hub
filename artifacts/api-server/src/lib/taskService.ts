import { db, userTasksTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";

export interface CreateTaskArgs {
  userId: string;
  title: string;
  notes?: string;
  dueDate?: Date | null;
  priority?: "low" | "normal" | "high" | "urgent";
  status?: "open" | "in_progress" | "completed" | "cancelled";
  linkedEntityType?: string;
  linkedEntityId?: string;
}

/** Create a task and return its id. */
export async function createTask(args: CreateTaskArgs): Promise<string | null> {
  try {
    const [row] = await db
      .insert(userTasksTable)
      .values({
        userId: args.userId,
        title: args.title.slice(0, 500),
        notes: args.notes ?? "",
        dueDate: args.dueDate ?? null,
        priority: args.priority ?? "normal",
        status: args.status ?? "open",
        linkedEntityType: args.linkedEntityType ?? "",
        linkedEntityId: args.linkedEntityId ?? "",
      })
      .returning({ id: userTasksTable.id });
    return row?.id ?? null;
  } catch (err) {
    logger.warn({ err }, "createTask failed");
    return null;
  }
}

/** Update task status, scoped to user. */
export async function updateTaskStatus(
  userId: string,
  taskId: string,
  status: "open" | "in_progress" | "completed" | "cancelled",
): Promise<void> {
  if (!taskId) return;
  try {
    await db
      .update(userTasksTable)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(userTasksTable.id, taskId), eq(userTasksTable.userId, userId)));
  } catch (err) {
    logger.warn({ err, taskId }, "updateTaskStatus failed");
  }
}
