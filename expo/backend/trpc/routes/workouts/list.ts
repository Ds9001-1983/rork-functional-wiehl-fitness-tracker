import { z } from "zod";
import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default protectedProcedure
  .input(z.object({ userId: z.string().optional() }).optional())
  .query(async ({ ctx, input }) => {
    const { userId, role } = ctx.user;

    if (role === 'trainer') {
      // Trainer kann Workouts eines bestimmten Clients oder aller Clients abrufen
      if (input?.userId) {
        return storage.workouts.getByUserId(input.userId);
      }
      return storage.workouts.getAll();
    }

    // Clients sehen NUR eigene Workouts - userId aus Token, nicht aus Input
    return storage.workouts.getByUserId(userId);
  });
