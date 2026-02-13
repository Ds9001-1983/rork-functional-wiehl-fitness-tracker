import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .query(async ({ ctx }) => {
    const studio = await storage.studios.getById(ctx.user.studioId);
    return studio;
  });
