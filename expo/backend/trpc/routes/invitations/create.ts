import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default publicProcedure
  .input(z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
  }))
  .mutation(async ({ input }) => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const invitation = await storage.invitations.create({
      code,
      name: input.name,
      email: input.email,
      createdAt: new Date().toISOString(),
    });
    
    console.log('[Server] Created invitation:', code);
    
    return invitation;
  });