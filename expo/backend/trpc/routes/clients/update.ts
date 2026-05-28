import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { trainerProcedure } from '../../create-context';
import { storage } from '../../../storage';

export default trainerProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().min(1).max(255).optional(),
    email: z.string().email().max(255).optional(),
    phone: z.string().max(50).optional(),
    lookupEmail: z.string().email().max(255).optional(),
  }))
  .mutation(async ({ input }) => {
    const { id, lookupEmail, ...updates } = input;
    let result = await storage.clients.updateProfile(id, updates);

    // Fallback: Falls die übergebene ID ungültig/unbekannt ist (z. B. veralteter
    // App-Cache mit Timestamp-ID), den Kunden über die aktuelle E-Mail auflösen.
    if (!result.ok && result.reason === 'not_found' && lookupEmail) {
      const client = await storage.clients.findByEmail(lookupEmail);
      if (client) {
        result = await storage.clients.updateProfile(client.id, updates);
      }
    }

    if (!result.ok) {
      if (result.reason === 'email_taken') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Diese E-Mail-Adresse wird bereits verwendet.' });
      }
      throw new TRPCError({ code: 'NOT_FOUND', message: 'CLIENT_NOT_FOUND' });
    }
    return { success: true };
  });
