import crypto from 'crypto';
import { TRPCError } from '@trpc/server';
import { superadminProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default superadminProcedure
  .input(z.object({
    name: z.string(),
    slug: z.string(),
    ownerEmail: z.string().email().optional(),
    primaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    maxUsers: z.number().optional(),
  }))
  .mutation(async ({ input }) => {
    // Check slug uniqueness
    const existing = await storage.studios.getBySlug(input.slug);
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'SLUG_EXISTS' });
    }

    const studio = await storage.studios.create(input);

    // If owner email provided, create admin user for that studio
    if (input.ownerEmail) {
      try {
        const existingUser = await storage.users.findByEmail(input.ownerEmail);
        if (!existingUser) {
          const user = await storage.users.create({
            email: input.ownerEmail,
            password: crypto.randomBytes(16).toString('hex'),
            role: 'admin',
            studioId: studio.id,
          });
          await storage.studioMembers.add(studio.id, user.id, 'admin');
        }
      } catch { /* non-critical */ }
    }

    return studio;
  });
