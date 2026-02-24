import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { trainerProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default trainerProcedure
  .input(z.object({
    name: z.string().min(1).max(255),
    email: z.string().email().max(255),
    phone: z.string().max(50).optional(),
    starterPassword: z.string().min(6).max(100).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Check if client with this email or phone already exists
    const existingClients = await storage.clients.getAll();

    // Check for duplicate email
    const existingClientByEmail = existingClients.find(client => client.email === input.email);
    if (existingClientByEmail) {
      throw new TRPCError({ code: 'CONFLICT', message: 'EMAIL_EXISTS' });
    }

    // Check for duplicate phone number (if provided)
    if (input.phone && input.phone.trim()) {
      const existingClientByPhone = existingClients.find(client => client.phone === input.phone);
      if (existingClientByPhone) {
        throw new TRPCError({ code: 'CONFLICT', message: 'PHONE_EXISTS' });
      }
    }

    const starterPassword = input.starterPassword || 'TEMP123';

    const newClient = await storage.clients.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
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

    return newClient;
  });
