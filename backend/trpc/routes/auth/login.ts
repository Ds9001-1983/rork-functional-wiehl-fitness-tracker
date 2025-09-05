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
    
    // Get all users from database (including trainer)
    const clients = await storage.clients.getAll();
    console.log('[Server] All users in storage:', clients.map((c) => ({ id: c.id, email: c.email, role: c.role, hasPassword: !!c.starterPassword })));
    
    const existingUser = clients.find((client) => client.email === email);
    
    if (existingUser) {
      console.log('[Server] Found existing user:', existingUser.email, 'role:', existingUser.role, 'with password:', existingUser.starterPassword);
      
      // Check password - use starter password
      const expectedPassword = existingUser.starterPassword;
      
      if (!expectedPassword) {
        console.log('[Server] No starter password set for user:', email);
        throw new Error('INVALID_PASSWORD');
      }
      
      const isValidPassword = password === expectedPassword;
      
      if (!isValidPassword) {
        console.log('[Server] Invalid password for user:', email);
        console.log('[Server] Expected:', expectedPassword);
        console.log('[Server] Received:', password);
        throw new Error('INVALID_PASSWORD');
      }
      
      console.log('[Server] User login successful:', email, 'role:', existingUser.role);
      return { success: true, user: existingUser };
    }
    
    // If not found as existing user, check if it's a valid invitation code login
    const invitations = await storage.invitations.getAll();
    const invitation = invitations.find((inv) => 
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