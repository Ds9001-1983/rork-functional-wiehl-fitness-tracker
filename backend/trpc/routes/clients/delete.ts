import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default publicProcedure
  .input(z.object({
    id: z.string(),
  }))
  .mutation(async ({ input }) => {
    const deleted = await storage.clients.delete(input.id);
    console.log('[Server] Deleted client:', input.id, 'Success:', deleted);
    
    return { success: deleted };
  });