import { z } from "zod";
import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default protectedProcedure
  .input(z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== 'trainer') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Trainer dürfen Einladungen erstellen.' });
    }

    const code = randomBytes(4).toString('hex').toUpperCase();
    const invitation = await storage.invitations.create({
      code,
      name: input.name,
      email: input.email,
      createdAt: new Date().toISOString(),
    });
    
    console.log('[Server] Created invitation:', code);
    
    return invitation;
  });