import { protectedProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default protectedProcedure
  .input(z.object({
    userId: z.string(),
    name: z.string(),
    exercises: z.array(z.any()),
  }))
  .mutation(async ({ input }) => {
    return storage.routines.create(input);
  });
