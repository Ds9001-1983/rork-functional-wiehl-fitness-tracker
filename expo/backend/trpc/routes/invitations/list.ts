import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default protectedProcedure
  .query(async ({ ctx }) => {
    if (ctx.user.role !== 'trainer') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Trainer dürfen Einladungen sehen.' });
    }
    const invitations = await storage.invitations.getAll();
    return invitations;
  });