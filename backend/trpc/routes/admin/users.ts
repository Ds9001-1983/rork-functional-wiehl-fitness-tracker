import { publicProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default publicProcedure
  .query(async () => {
    const allClients = await storage.clients.getAll();

    return allClients.map(c => ({
      id: c.id,
      email: c.email,
      role: c.role,
      passwordChanged: c.passwordChanged,
      createdAt: c.joinDate,
    }));
  });
