import { adminProcedure } from '../../create-context';
import { storage } from '../../../storage';
import { z } from 'zod';

export default adminProcedure
  .input(z.object({
    name: z.string().optional(),
    logoUrl: z.string().optional(),
    primaryColor: z.string().optional(),
    accentColor: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const studio = await storage.studios.update('1', input);
    return studio;
  });
