import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default protectedProcedure
  .input(z.object({
    name: z.string(),
    description: z.string().optional(),
    exercises: z.any(),
    schedule: z.any().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== 'trainer') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Trainer dürfen Pläne erstellen.' });
    }

    const plan = await storage.workoutPlans.create({
      name: input.name,
      description: input.description,
      exercises: input.exercises,
      schedule: input.schedule,
      createdBy: ctx.user.userId,
      assignedTo: [],
      createdAt: new Date().toISOString(),
    } as never);

    console.log('[Server] Created plan:', plan.id);
    return plan;
  });
