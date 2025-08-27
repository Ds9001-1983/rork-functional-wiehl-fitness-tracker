import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { storage } from "../../../storage";

export default publicProcedure
  .input(z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    starterPassword: z.string().optional(),
  }))
  .mutation(({ input }) => {
    // Check if client with this email or phone already exists
    const existingClients = storage.clients.getAll();
    
    // Check for duplicate email
    const existingClientByEmail = existingClients.find(client => client.email === input.email);
    if (existingClientByEmail) {
      console.log('[Server] Client with email already exists:', input.email);
      throw new Error('CLIENT_EMAIL_EXISTS');
    }
    
    // Check for duplicate phone number (if provided)
    if (input.phone && input.phone.trim()) {
      const existingClientByPhone = existingClients.find(client => client.phone === input.phone);
      if (existingClientByPhone) {
        console.log('[Server] Client with phone already exists:', input.phone);
        throw new Error('CLIENT_PHONE_EXISTS');
      }
    }
    
    const starterPassword = input.starterPassword || 'TEMP123'; // Fallback password
    console.log('[Server] Creating client with password:', starterPassword);
    
    const newClient = storage.clients.create({
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
    
    console.log('[Server] Created client:', newClient.id, 'with password:', newClient.starterPassword);
    console.log('[Server] All clients after creation:', storage.clients.getAll().map(c => ({ id: c.id, email: c.email, password: c.starterPassword })));
    return newClient;
  });