import { trainerProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default trainerProcedure
  .query(async ({ ctx }) => {
    const invitations = await storage.invitations.getAll();
    return invitations;
  });