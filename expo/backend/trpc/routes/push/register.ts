import { z } from "zod";
import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default protectedProcedure
  .input(z.object({
    token: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    await storage.pushTokens.save(ctx.user.userId, input.token);
    console.log('[Server] Push token registered for user', ctx.user.userId);
    return { success: true };
  });
