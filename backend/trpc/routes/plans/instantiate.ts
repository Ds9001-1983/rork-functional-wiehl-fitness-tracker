import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default trainerProcedure
  .input(z.object({
    templateId: z.string(),
    userIds: z.array(z.string()).min(1),
  }))
  .mutation(async ({ input, ctx }) => {
    const instances = [];

    for (const userId of input.userIds) {
      const instance = await storage.workoutPlans.instantiate(
        input.templateId,
        userId,
        ctx.user.studioId
      );

      if (!instance) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'TEMPLATE_NOT_FOUND',
        });
      }

      instances.push(instance);
    }

    console.log('[Server] Instantiated plan', input.templateId, 'for', input.userIds.length, 'users');
    return { success: true, instances };
  });
