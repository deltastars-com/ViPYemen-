import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Internal action called by the cron job to process the file forwarding queue.
 * Processes files in batches to avoid overwhelming the server.
 */
export const processQueue = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; total: number }> => {
    const pending = await ctx.runQuery(api.fileQueueMutations.getPendingFiles, {
      limit: 5,
    });

    if (!pending || pending.length === 0) return { processed: 0, total: 0 };

    let processed = 0;
    for (const file of pending) {
      try {
        await ctx.runMutation(api.fileQueueMutations.markForwarding, {
          id: file._id,
        });

        // Get entity title for caption
        let entityTitle: string | undefined;
        const entity = await ctx.runQuery(api.fileQueueMutations.getEntityTitle, {
          entityType: file.entityType,
          entityId: file.entityId,
        });
        entityTitle = entity?.title;

        const result = await ctx.runAction(api.fileForward.processFileQueue, {
          queueId: file._id,
          storageId: file.storageId,
          fileName: file.fileName,
          fileKind: file.fileKind,
          mimeType: file.mimeType,
          entityType: file.entityType,
          entityTitle,
        });

        if (result?.ok) processed++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[FileQueue:Cron] Error processing ${file.fileName}:`, message);
        await ctx.runMutation(api.fileQueueMutations.markFailed, {
          id: file._id,
          error: message,
        }).catch(() => {});
      }
    }

    // Also clean up forwarded files (delete from Convex storage)
    const forwarded = await ctx.runQuery(api.fileQueueMutations.getForwardedForCleanup, { limit: 10 });
    if (forwarded && forwarded.length > 0) {
      for (const file of forwarded) {
        try {
          await ctx.runMutation(api.fileQueueMutations.scheduleCleanup, {
            queueId: file._id,
            storageId: file.storageId,
          });
        } catch {
          // Best effort
        }
      }
    }

    return { processed, total: pending.length };
  },
});
