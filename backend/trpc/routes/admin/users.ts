import { adminProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default adminProcedure
  .query(async ({ ctx }) => {
    const allClients = await storage.clients.getAll(ctx.user.studioId);

    return allClients.map(c => ({
      id: c.id,
      email: c.email,
      role: c.role,
      passwordChanged: c.passwordChanged,
      createdAt: c.joinDate,
    }));
  });
