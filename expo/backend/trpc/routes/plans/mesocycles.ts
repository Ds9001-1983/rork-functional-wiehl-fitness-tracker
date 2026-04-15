import { trainerProcedure, protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export const createMesocycle = trainerProcedure
  .input(z.object({
    clientId: z.string().optional(),
    name: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
    phases: z.array(z.object({
      name: z.string(),
      weeks: z.number(),
      intensity: z.number(), // percentage
      planId: z.string().optional(),
      description: z.string().optional(),
    })),
  }))
  .mutation(async ({ input, ctx }) => {
    return storage.mesocycles.create(
      input.clientId || null,
      input.name,
      input.startDate,
      input.endDate,
      input.phases,
      ctx.user.userId
    );
  });

export const listMesocycles = protectedProcedure
  .query(async ({ ctx }) => {
    return storage.mesocycles.list();
  });

export const updateMesocycle = trainerProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    phases: z.array(z.object({
      name: z.string(),
      weeks: z.number(),
      intensity: z.number(),
      planId: z.string().optional(),
      description: z.string().optional(),
    })).optional(),
  }))
  .mutation(async ({ input }) => {
    const { id, ...updates } = input;
    const dbUpdates: Record<string, any> = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.startDate) dbUpdates.start_date = updates.startDate;
    if (updates.endDate) dbUpdates.end_date = updates.endDate;
    if (updates.phases) dbUpdates.phases = updates.phases;
    return storage.mesocycles.update(id, dbUpdates);
  });

export const deleteMesocycle = trainerProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input }) => {
    return storage.mesocycles.delete(input.id);
  });
