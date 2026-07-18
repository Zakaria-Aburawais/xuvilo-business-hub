import {
  createDocument,
  updateDocument,
  incrementUsage,
  type DocType,
  type DocStatus,
  type SavedDoc,
  type ApiError,
} from "./savedDocsApi";

export interface SaveDocInput {
  type: DocType;
  title: string;
  clientName: string;
  amount: number;
  currency: string;
  status?: DocStatus;
  payload: Record<string, unknown>;
}

export interface SaveDocResult {
  ok: boolean;
  doc?: SavedDoc;
  blocked?: boolean;
  blockedMessage?: string;
  error?: string;
}

/**
 * Mirror a save to the API. If `restoreId` is provided we PATCH; otherwise we
 * first attempt a usage increment (free-tier gate) then POST.
 */
export async function syncSaveDocument(
  input: SaveDocInput,
  restoreId: string | null,
): Promise<SaveDocResult> {
  try {
    if (restoreId) {
      const updated = await updateDocument(restoreId, input);
      return { ok: true, doc: updated };
    }
    try {
      await incrementUsage();
    } catch (e) {
      const err = e as ApiError;
      if (err && err.status === 402) {
        return {
          ok: false,
          blocked: true,
          blockedMessage:
            err.message || "You've used all free documents for this month.",
        };
      }
      throw e;
    }
    const created = await createDocument(input);
    return { ok: true, doc: created };
  } catch (e) {
    const err = e as ApiError;
    return { ok: false, error: err?.message || "Save failed" };
  }
}
