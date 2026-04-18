import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, adminProcedure } from '../../create-context';
import { storage } from '../../../storage';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---- Categories (public read, admin write) ----

export const listCategories = protectedProcedure
  .input(z.object({ includeInactive: z.boolean().optional() }).optional())
  .query(async ({ input, ctx }) => {
    const includeInactive = input?.includeInactive && ctx.user.role === 'admin';
    return await storage.exerciseCategories.list(includeInactive ?? false);
  });

export const createCategory = adminProcedure
  .input(z.object({
    slug: z.string().regex(slugRegex, 'slug muss kleinbuchstaben+bindestriche sein').optional(),
    name: z.string().min(1).max(100),
    icon: z.string().max(10).optional(),
    orderIndex: z.number().int().optional(),
  }))
  .mutation(async ({ input }) => {
    const slug = input.slug ?? toSlug(input.name);
    if (!slugRegex.test(slug)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ungültiger slug.' });
    }
    try {
      return await storage.exerciseCategories.create({
        slug,
        name: input.name,
        icon: input.icon,
        orderIndex: input.orderIndex,
      });
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('duplicate key')) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Kategorie existiert bereits.' });
      }
      throw err;
    }
  });

export const updateCategory = adminProcedure
  .input(z.object({
    slug: z.string(),
    patch: z.object({
      name: z.string().min(1).max(100).optional(),
      icon: z.string().max(10).nullable().optional(),
      orderIndex: z.number().int().optional(),
      active: z.boolean().optional(),
    }),
  }))
  .mutation(async ({ input }) => {
    const ok = await storage.exerciseCategories.update(input.slug, input.patch);
    if (!ok) throw new TRPCError({ code: 'NOT_FOUND', message: 'Kategorie nicht gefunden.' });
    return { success: true };
  });

// ---- Exercises (public read, admin write) ----

export const listExercises = protectedProcedure
  .input(z.object({ includeInactive: z.boolean().optional() }).optional())
  .query(async ({ input, ctx }) => {
    const includeInactive = input?.includeInactive && ctx.user.role === 'admin';
    return await storage.exercises.list(includeInactive ?? false);
  });

export const createExercise = adminProcedure
  .input(z.object({
    id: z.string().regex(slugRegex, 'id muss kleinbuchstaben+bindestriche sein').optional(),
    name: z.string().min(1).max(255),
    category: z.string().min(1),
    muscleGroups: z.array(z.string()).min(1, 'Mindestens eine Muskelgruppe angeben'),
    equipment: z.string().max(255).optional(),
    instructions: z.string().optional(),
    videoUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  }))
  .mutation(async ({ input, ctx }) => {
    const id = input.id ?? toSlug(input.name);
    if (!slugRegex.test(id)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ungültige id.' });
    }
    try {
      return await storage.exercises.create({
        id,
        name: input.name,
        category: input.category,
        muscleGroups: input.muscleGroups,
        equipment: input.equipment,
        instructions: input.instructions,
        videoUrl: input.videoUrl,
        createdBy: ctx.user.userId,
      });
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('duplicate key')) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Übung mit dieser ID existiert bereits.' });
      }
      throw err;
    }
  });

export const updateExercise = adminProcedure
  .input(z.object({
    id: z.string(),
    patch: z.object({
      name: z.string().min(1).max(255).optional(),
      category: z.string().min(1).optional(),
      muscleGroups: z.array(z.string()).min(1).optional(),
      equipment: z.string().max(255).nullable().optional(),
      instructions: z.string().nullable().optional(),
      videoUrl: z.string().url().nullable().optional().or(z.literal('').transform(() => null)),
      active: z.boolean().optional(),
    }),
  }))
  .mutation(async ({ input }) => {
    const ok = await storage.exercises.update(input.id, input.patch);
    if (!ok) throw new TRPCError({ code: 'NOT_FOUND', message: 'Übung nicht gefunden.' });
    return { success: true };
  });

export const toggleExerciseActive = adminProcedure
  .input(z.object({ id: z.string(), active: z.boolean() }))
  .mutation(async ({ input }) => {
    const ok = await storage.exercises.update(input.id, { active: input.active });
    if (!ok) throw new TRPCError({ code: 'NOT_FOUND', message: 'Übung nicht gefunden.' });
    return { success: true };
  });
