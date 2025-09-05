const { storage } = require('./backend/storage');

async function setupTrainer() {
  console.log('🔧 Setting up trainer user...');
  
  try {
    // Check if trainer already exists
    const clients = await storage.clients.getAll();
    const existingTrainer = clients.find(client => client.email === 'app@functional-wiehl.de');
    
    if (existingTrainer) {
      console.log('✅ Trainer already exists, updating password...');
      
      // Update existing trainer
      const updatedTrainer = {
        ...existingTrainer,
        starterPassword: 'Ds9001Ds9001',
        role: 'trainer',
        passwordChanged: true
      };
      
      await storage.clients.update(existingTrainer.id, updatedTrainer);
      console.log('✅ Trainer password updated successfully!');
    } else {
      console.log('➕ Creating new trainer user...');
      
      // Create new trainer
      const trainer = await storage.clients.create({
        name: 'Functional Wiehl Trainer',
        email: 'app@functional-wiehl.de',
        role: 'trainer',
        joinDate: new Date().toISOString(),
        passwordChanged: true,
        starterPassword: 'Ds9001Ds9001',
        stats: {
          totalWorkouts: 0,
          totalVolume: 0,
          currentStreak: 0,
          longestStreak: 0,
          personalRecords: {},
        },
      });
      
      console.log('✅ Trainer created successfully!');
      console.log('📧 Email: app@functional-wiehl.de');
      console.log('🔑 Password: Ds9001Ds9001');
    }
    
    // List all users for verification
    const allClients = await storage.clients.getAll();
    console.log('\n👥 All users in database:');
    allClients.forEach(client => {
      console.log(`- ${client.email} (${client.role}) - Password: ${client.starterPassword}`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up trainer:', error);
  }
}

setupTrainer();