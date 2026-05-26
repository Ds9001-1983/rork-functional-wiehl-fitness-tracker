import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .input(z.object({ email: z.string().email() }))
  .query(async ({ ctx, input }) => {
    if (ctx.user.role !== 'trainer' && ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Trainer dürfen Kunden suchen.' });
    }
    const client = await storage.clients.findByEmail(input.email);
    if (!client) return null;
    return client;
  });
