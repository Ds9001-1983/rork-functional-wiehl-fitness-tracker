import { trainerProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default trainerProcedure
  .query(async ({ ctx }) => {
    const invitations = await storage.invitations.getAll(ctx.user.studioId);
    console.log('[Server] Fetching invitations:', invitations.length);
    return invitations;
  });