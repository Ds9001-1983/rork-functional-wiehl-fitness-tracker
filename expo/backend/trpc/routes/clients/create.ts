import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default protectedProcedure
  .input(z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    starterPassword: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Nur Trainer dürfen Clients erstellen
    if (ctx.user.role !== 'trainer') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Trainer dürfen Kunden erstellen.' });
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedPhone = input.phone?.trim();

    // Check if client with this email or phone already exists
    const existingClients = await storage.clients.getAll();

    // Check for duplicate email
    const existingClientByEmail = existingClients.find(client => client.email === normalizedEmail);
    if (existingClientByEmail) {
      console.log('[Server] Client with email already exists:', normalizedEmail);
      throw new Error('CLIENT_EMAIL_EXISTS');
    }

    // Check for duplicate phone number (if provided)
    if (normalizedPhone) {
      const existingClientByPhone = existingClients.find(client => client.phone === normalizedPhone);
      if (existingClientByPhone) {
        console.log('[Server] Client with phone already exists:', normalizedPhone);
        throw new Error('CLIENT_PHONE_EXISTS');
      }
    }

    const starterPassword = input.starterPassword || 'TEMP123';

    const newClient = await storage.clients.create({
      name: input.name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      role: 'client' as const,
      joinDate: new Date().toISOString(),
      starterPassword: starterPassword,
      passwordChanged: false,
      stats: {
        totalWorkouts: 0,
        totalVolume: 0,
        currentStreak: 0,
        longestStreak: 0,
        personalRecords: {},
      },
    });

    console.log('[Server] Created client:', newClient.id, 'email:', newClient.email);
    return newClient;
  });