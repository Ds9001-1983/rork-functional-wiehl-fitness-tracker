import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default trainerProcedure
  .input(z.object({
    name: z.string(),
    description: z.string(),
    type: z.enum(['workout_count', 'total_volume', 'streak']),
    target: z.number(),
    startDate: z.string(),
    endDate: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    return storage.challenges.create({ ...input, createdBy: ctx.user.userId });
  });
