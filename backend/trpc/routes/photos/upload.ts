import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    imageData: z.string(), // base64 encoded
    category: z.enum(['front', 'side', 'back']),
    notes: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    return storage.progressPhotos.create(
      ctx.user.userId,
      input.imageData,
      input.category,
      input.notes
    );
  });
