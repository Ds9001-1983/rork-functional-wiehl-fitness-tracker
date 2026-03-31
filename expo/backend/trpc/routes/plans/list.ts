import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default protectedProcedure
  .query(async ({ ctx }) => {
    const { userId, role } = ctx.user;

    if (role === 'trainer') {
      return storage.plans.getByCreator(userId);
    }

    // Clients sehen nur ihnen zugewiesene Pläne
    return storage.plans.getAssignedToUser(userId);
  });
