import { z } from 'zod';
import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default trainerProcedure
  .input(z.object({
    id: z.string(),
  }))
  .mutation(async ({ input }) => {
    const deleted = await storage.workoutPlans.delete(input.id);
    console.log('[Server] Deleted plan:', input.id, 'success:', deleted);
    return { success: deleted };
  });
