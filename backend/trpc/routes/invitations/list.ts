import { publicProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default publicProcedure
  .query(() => {
    const invitations = storage.invitations.getAll();
    console.log('[Server] Fetching invitations:', invitations.length);
    return invitations;
  });