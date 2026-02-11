import { publicProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default publicProcedure
  .query(async () => {
    try {
      const clients = await storage.clients.getAll();
      console.log('[Server] Fetched clients:', clients.length);
      return clients;
    } catch (error) {
      console.log('[Server] Error fetching clients:', error);
      throw new Error('Failed to fetch clients');
    }
  });
