import { superadminProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default superadminProcedure
  .query(async () => {
    const studios = await storage.studios.getAll();
    const studioStats = await Promise.all(
      studios.map(async (s) => ({
        ...s,
        memberCount: await storage.studios.getMemberCount(s.id),
      }))
    );
    return studioStats;
  });
