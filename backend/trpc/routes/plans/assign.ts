import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default trainerProcedure
  .input(z.object({
    planId: z.string(),
    userId: z.string(),
    createInstance: z.boolean().optional(), // if true, creates independent copy
  }))
  .mutation(async ({ input, ctx }) => {
    if (input.createInstance) {
      // Create an independent instance copy for this user
      const instance = await storage.workoutPlans.instantiate(
        input.planId,
        input.userId
      );

      if (!instance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'PLAN_NOT_FOUND' });
      }

      try {
        await storage.notifications.create({
          userId: input.userId,
          title: 'Neuer Trainingsplan',
          body: `Dein Trainer hat dir den Plan "${instance.name}" zugewiesen.`,
          type: 'system',
          data: { type: 'plan_assigned', planId: instance.id, templateId: input.planId },
        });
      } catch { /* Nicht-kritisch */ }

      return { success: true, instanceId: instance.id };
    }

    // Legacy: just add to assignedTo array
    const assigned = await storage.workoutPlans.assign(input.planId, input.userId);

    if (!assigned) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'PLAN_NOT_FOUND' });
    }

    try {
      const allPlans = await storage.workoutPlans.getAll();
      const plan = allPlans.find(p => p.id === input.planId);
      await storage.notifications.create({
        userId: input.userId,
        title: 'Neuer Trainingsplan',
        body: `Dein Trainer hat dir den Plan "${plan?.name || 'Trainingsplan'}" zugewiesen.`,
        type: 'system',
        data: { type: 'plan_assigned', planId: input.planId },
      });
    } catch { /* Nicht-kritisch */ }

    return { success: true };
  });
