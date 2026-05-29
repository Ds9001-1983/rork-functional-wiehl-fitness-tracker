import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { trainerProcedure } from "../../create-context";
import { storage } from "../../../storage";

// trainerProcedure erlaubt Trainer UND Admin (behebt: Admin konnte vorher nicht löschen).
export default trainerProcedure
  .input(z.object({
    id: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (input.id === ctx.user.userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Eigenes Konto kann hier nicht gelöscht werden.' });
    }

    // Ziel-Rolle prüfen, damit kein Trainer/Admin versehentlich/böswillig privilegierte Konten löscht.
    const target = await storage.users.findById(input.id);
    if (!target) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Nutzer nicht gefunden.' });
    }
    if (target.role === 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin-Konten können hier nicht gelöscht werden.' });
    }
    if (ctx.user.role === 'trainer' && target.role !== 'client') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Trainer dürfen nur Kunden löschen.' });
    }

    // Vollständige, transaktionale Löschung (kein verwaister Datensatz in Nebentabellen).
    const deleted = await storage.privacy.deleteUserData(input.id);
    console.log('[Server] Deleted user:', input.id, 'role:', target.role, 'by:', ctx.user.role, 'success:', deleted);

    return { success: deleted };
  });