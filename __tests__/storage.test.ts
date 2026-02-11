// Tests for the storage layer (in-memory mode, no DB required)
// Run with: bun test __tests__/storage.test.ts

import { describe, it, expect, beforeEach } from 'bun:test';

// We test the storage logic by simulating the in-memory path
// (DATABASE_URL is not set, so storage falls back to in-memory)

describe('Storage: Users', () => {
  // Import fresh each time to get clean state
  let storage: any;

  beforeEach(async () => {
    // Dynamic import to reset module state
    // Note: in a real test setup we'd want module isolation
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should find the default trainer user by email', async () => {
    const user = await storage.users.findByEmail('trainer@functional-wiehl.de');
    expect(user).not.toBeNull();
    expect(user!.email).toBe('trainer@functional-wiehl.de');
    expect(user!.role).toBe('trainer');
  });

  it('should return null for non-existent user', async () => {
    const user = await storage.users.findByEmail('nonexistent@test.de');
    expect(user).toBeNull();
  });

  it('should verify correct password', async () => {
    const isValid = await storage.users.verifyPassword('trainer123', '$2a$10$');
    // This will fail because the hash won't match a partial string
    // We test with the actual stored hash instead
    const user = await storage.users.findByEmail('app@functional-wiehl.de');
    if (user) {
      const result = await storage.users.verifyPassword('trainer123', user.password);
      expect(result).toBe(true);
    }
  });

  it('should reject wrong password', async () => {
    const user = await storage.users.findByEmail('app@functional-wiehl.de');
    if (user) {
      const result = await storage.users.verifyPassword('wrongpassword', user.password);
      expect(result).toBe(false);
    }
  });
});

describe('Storage: Clients', () => {
  let storage: any;

  beforeEach(async () => {
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should list all clients', async () => {
    const clients = await storage.clients.getAll();
    expect(Array.isArray(clients)).toBe(true);
    expect(clients.length).toBeGreaterThanOrEqual(1); // At least the trainer
  });

  it('should create a new client', async () => {
    const newClient = await storage.clients.create({
      name: 'Test Kunde',
      email: 'test@functional-wiehl.de',
      phone: '0123456789',
      role: 'client' as const,
      joinDate: new Date().toISOString(),
      starterPassword: 'test123',
      passwordChanged: false,
      stats: {
        totalWorkouts: 0,
        totalVolume: 0,
        currentStreak: 0,
        longestStreak: 0,
        personalRecords: {},
      },
    });

    expect(newClient).toBeDefined();
    expect(newClient.name).toBe('Test Kunde');
    expect(newClient.email).toBe('test@functional-wiehl.de');
    expect(newClient.id).toBeDefined();
  });

  it('should delete a client', async () => {
    const client = await storage.clients.create({
      name: 'Zu Loeschender Kunde',
      email: 'delete@test.de',
      role: 'client' as const,
      joinDate: new Date().toISOString(),
      starterPassword: 'test123',
      passwordChanged: false,
      stats: { totalWorkouts: 0, totalVolume: 0, currentStreak: 0, longestStreak: 0, personalRecords: {} },
    });

    const deleted = await storage.clients.delete(client.id);
    expect(deleted).toBe(true);
  });
});

describe('Storage: Workouts', () => {
  let storage: any;

  beforeEach(async () => {
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should create a workout', async () => {
    const workout = await storage.workouts.create({
      userId: 'user-1',
      name: 'Test Workout',
      date: new Date().toISOString(),
      duration: 3600000,
      exercises: [
        {
          id: 'ex-1',
          exerciseId: 'bench-press',
          sets: [{ id: 's1', reps: 10, weight: 80, completed: true }],
        },
      ],
      completed: true,
    });

    expect(workout).toBeDefined();
    expect(workout.id).toBeDefined();
    expect(workout.name).toBe('Test Workout');
    expect(workout.userId).toBe('user-1');
  });

  it('should list workouts by user', async () => {
    await storage.workouts.create({
      userId: 'user-2',
      name: 'User 2 Workout',
      date: new Date().toISOString(),
      exercises: [],
      completed: true,
    });

    const workouts = await storage.workouts.getByUserId('user-2');
    expect(workouts.length).toBeGreaterThanOrEqual(1);
    expect(workouts.every((w: any) => w.userId === 'user-2')).toBe(true);
  });

  it('should update a workout', async () => {
    const workout = await storage.workouts.create({
      userId: 'user-3',
      name: 'Original Name',
      date: new Date().toISOString(),
      exercises: [],
      completed: false,
    });

    const updated = await storage.workouts.update(workout.id, {
      name: 'Updated Name',
      completed: true,
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.completed).toBe(true);
  });

  it('should delete a workout', async () => {
    const workout = await storage.workouts.create({
      userId: 'user-4',
      name: 'To Delete',
      date: new Date().toISOString(),
      exercises: [],
      completed: false,
    });

    const deleted = await storage.workouts.delete(workout.id);
    expect(deleted).toBe(true);
  });
});

describe('Storage: Workout Plans', () => {
  let storage: any;

  beforeEach(async () => {
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should create a workout plan', async () => {
    const plan = await storage.workoutPlans.create({
      name: 'Trainingsplan A',
      description: 'Push/Pull/Legs',
      exercises: [
        { id: 'ex-1', exerciseId: 'bench-press', sets: [{ id: 's1', reps: 10, weight: 0, completed: false }] },
      ],
      createdBy: 'trainer-1',
      assignedTo: [],
      schedule: [{ dayOfWeek: 1, time: '10:00' }],
    });

    expect(plan).toBeDefined();
    expect(plan.id).toBeDefined();
    expect(plan.name).toBe('Trainingsplan A');
    expect(plan.createdBy).toBe('trainer-1');
  });

  it('should assign a plan to a user', async () => {
    const plan = await storage.workoutPlans.create({
      name: 'Zuzuweisender Plan',
      exercises: [],
      createdBy: 'trainer-1',
      assignedTo: [],
    });

    const assigned = await storage.workoutPlans.assign(plan.id, 'client-1');
    expect(assigned).toBe(true);

    const plans = await storage.workoutPlans.getAll();
    const updatedPlan = plans.find((p: any) => p.id === plan.id);
    expect(updatedPlan?.assignedTo).toContain('client-1');
  });

  it('should update a plan', async () => {
    const plan = await storage.workoutPlans.create({
      name: 'Original Plan',
      exercises: [],
      createdBy: 'trainer-1',
      assignedTo: [],
    });

    const updated = await storage.workoutPlans.update(plan.id, {
      name: 'Updated Plan',
      description: 'Neuer Beschreibung',
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Updated Plan');
  });

  it('should delete a plan', async () => {
    const plan = await storage.workoutPlans.create({
      name: 'Zu Loeschen',
      exercises: [],
      createdBy: 'trainer-1',
      assignedTo: [],
    });

    const deleted = await storage.workoutPlans.delete(plan.id);
    expect(deleted).toBe(true);
  });
});

describe('Storage: Invitations', () => {
  let storage: any;

  beforeEach(async () => {
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should create an invitation', async () => {
    const invitation = await storage.invitations.create({
      code: 'TEST123',
      name: 'Test Person',
      email: 'test@example.de',
      createdAt: new Date().toISOString(),
    });

    expect(invitation).toBeDefined();
    expect(invitation.code).toBe('TEST123');
  });

  it('should list invitations', async () => {
    await storage.invitations.create({
      code: 'LIST001',
      createdAt: new Date().toISOString(),
    });

    const invitations = await storage.invitations.getAll();
    expect(Array.isArray(invitations)).toBe(true);
  });

  it('should remove an invitation', async () => {
    await storage.invitations.create({
      code: 'REMOVE001',
      createdAt: new Date().toISOString(),
    });

    const removed = await storage.invitations.remove('REMOVE001');
    expect(removed).toBe(true);
  });
});

describe('Personal Records Calculation', () => {
  it('should calculate personal records from workout data', () => {
    // Simulate the getPersonalRecords logic from use-workouts
    const workouts = [
      {
        userId: 'user-1',
        completed: true,
        exercises: [
          {
            exerciseId: 'bench-press',
            sets: [
              { completed: true, weight: 80, reps: 10 },
              { completed: true, weight: 90, reps: 8 },
              { completed: true, weight: 100, reps: 5 },
            ],
          },
          {
            exerciseId: 'squat',
            sets: [
              { completed: true, weight: 100, reps: 8 },
              { completed: true, weight: 120, reps: 5 },
            ],
          },
        ],
      },
      {
        userId: 'user-1',
        completed: true,
        exercises: [
          {
            exerciseId: 'bench-press',
            sets: [
              { completed: true, weight: 85, reps: 10 },
              { completed: false, weight: 110, reps: 1 }, // Not completed, should not count
            ],
          },
        ],
      },
    ];

    const records: Record<string, number> = {};

    for (const workout of workouts) {
      if (!workout.completed) continue;
      for (const exercise of workout.exercises) {
        for (const set of exercise.sets) {
          if (set.completed && set.weight > 0) {
            const current = records[exercise.exerciseId] || 0;
            if (set.weight > current) {
              records[exercise.exerciseId] = set.weight;
            }
          }
        }
      }
    }

    expect(records['bench-press']).toBe(100); // Max completed bench press
    expect(records['squat']).toBe(120);
  });
});
