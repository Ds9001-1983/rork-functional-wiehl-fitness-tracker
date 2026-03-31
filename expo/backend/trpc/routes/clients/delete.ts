import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default protectedProcedure
  .input(z.object({
    id: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== 'trainer') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Trainer dürfen Kunden löschen.' });
    }

    const deleted = await storage.clients.delete(input.id);
    console.log('[Server] Deleted client:', input.id, 'Success:', deleted);
    
    return { success: deleted };
  });