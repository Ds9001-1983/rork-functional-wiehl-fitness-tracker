import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { storage } from '../../../storage';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    const { email, password } = input;
    
    console.log('[Server] Login attempt for:', email);
    
    // Trainer Login
    if (email === 'app@functional-wiehl.de' && password === 'Ds9001Ds9001') {
      const trainerUser = {
        id: 'trainer-admin',
        name: 'Functional Wiehl Trainer',
        email,
        role: 'trainer' as const,
        joinDate: new Date().toISOString(),
        passwordChanged: true,
        stats: {
          totalWorkouts: 0,
          totalVolume: 0,
          currentStreak: 0,
          longestStreak: 0,
          personalRecords: {},
        },
      };
      console.log('[Server] Trainer login successful');
      return { success: true, user: trainerUser };
    }
    
    // Client Login - Check if user exists in clients list
    const clients = await storage.clients.getAll();
    console.log('[Server] All clients in storage:', clients.map((c: any) => ({ id: c.id, email: c.email, hasPassword: !!c.starterPassword })));
    
    const existingClient = clients.find((client: any) => client.email === email);
    
    if (existingClient) {
      console.log('[Server] Found existing client:', existingClient.email, 'with password:', existingClient.starterPassword);
      
      // Check password - use starter password
      const expectedPassword = existingClient.starterPassword;
      
      if (!expectedPassword) {
        console.log('[Server] No starter password set for client:', email);
        throw new Error('INVALID_PASSWORD');
      }
      
      const isValidPassword = password === expectedPassword;
      
      if (!isValidPassword) {
        console.log('[Server] Invalid password for client:', email);
        console.log('[Server] Expected:', expectedPassword);
        console.log('[Server] Received:', password);
        throw new Error('INVALID_PASSWORD');
      }
      
      console.log('[Server] Client login successful:', email);
      return { success: true, user: existingClient };
    }
    
    // If not found as client, check if it's a valid invitation code login
    const invitations = await storage.invitations.getAll();
    const invitation = invitations.find((inv: any) => 
      (inv.email === email || inv.code === password) && 
      (inv.email === email || !inv.email)
    );
    
    if (invitation) {
      // Create new client from invitation
      const newClient = await storage.clients.create({
        name: invitation.name || email.split('@')[0],
        email: email,
        role: 'client',
        joinDate: new Date().toISOString(),
        passwordChanged: false,
        starterPassword: invitation.code,
        stats: {
          totalWorkouts: 0,
          totalVolume: 0,
          currentStreak: 0,
          longestStreak: 0,
          personalRecords: {},
        },
      });
      
      // Remove used invitation from storage
      await storage.invitations.remove(invitation.code);
      
      console.log('[Server] New client created from invitation:', email);
      console.log('[Server] Invitation used and should be removed:', invitation.code);
      return { success: true, user: newClient };
    }
    
    console.log('[Server] User not found or not invited:', email);
    throw new Error('USER_NOT_INVITED');
  });