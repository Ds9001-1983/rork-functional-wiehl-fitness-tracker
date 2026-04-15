import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default protectedProcedure
  .query(async ({ ctx }) => {
    const data = await storage.privacy.exportUserData(ctx.user.userId);

    console.log(`[Privacy] Data export requested by user ${ctx.user.userId}`);
    return data;
  });
