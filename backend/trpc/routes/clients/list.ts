import { TRPCError } from '@trpc/server';
import { publicProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default publicProcedure
  .query(async () => {
    try {
      const clients = await storage.clients.getAll();
      console.log('[Server] Fetched clients:', clients.length);
      return clients;
    } catch (error: any) {
      console.error('[Server] Error fetching clients:', error.message);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch clients',
      });
    }
  });
