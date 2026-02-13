import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .query(async ({ ctx }) => {
    try {
      const clients = await storage.clients.getAll(ctx.user.studioId);
      console.log('[Server] Fetched clients:', clients.length, 'studio:', ctx.user.studioId);
      return clients;
    } catch (error: any) {
      console.error('[Server] Error fetching clients:', error.message);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch clients',
      });
    }
  });
