import { trainerProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default trainerProcedure
  .query(async () => {
    const invitations = await storage.invitations.getAll();
    console.log('[Server] Fetching invitations:', invitations.length);
    return invitations;
  });