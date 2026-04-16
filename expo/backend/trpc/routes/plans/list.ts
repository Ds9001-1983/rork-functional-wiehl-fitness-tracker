import { z } from "zod";
import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default protectedProcedure
  .input(z.object({ userId: z.string().optional() }).optional())
  .query(async ({ ctx, input }) => {
    const { userId, role } = ctx.user;

    if (role === 'trainer') {
      // Trainer: wenn userId gegeben -> Pläne zugewiesen an diesen Kunden, sonst alle eigenen Templates/Instanzen
      if (input?.userId) {
        return storage.workoutPlans.getByUserId(input.userId);
      }
      return storage.workoutPlans.getByCreator(userId);
    }

    // Clients sehen nur ihnen zugewiesene Pläne
    return storage.workoutPlans.getByUserId(userId);
  });
