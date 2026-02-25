import { describe, it, expect, beforeEach } from 'bun:test';

// Test the route logic by testing through storage directly
// (Routes are thin wrappers around storage with auth + validation)

describe('Route: Workout CRUD with ownership', () => {
  let storage: any;

  beforeEach(async () => {
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should create a workout and retrieve it by id', async () => {
    const workout = await storage.workouts.create({
      userId: 'user-test-1',
      name: 'Push Day',
      date: new Date().toISOString(),
      duration: 3600000,
      exercises: [],
      completed: false,
    });

    expect(workout.id).toBeDefined();

    const found = await storage.workouts.getById(workout.id);
    expect(found).not.toBeNull();
    expect(found!.userId).toBe('user-test-1');
    expect(found!.name).toBe('Push Day');
  });

  it('should return null for non-existent workout', async () => {
    const found = await storage.workouts.getById('non-existent-id');
    expect(found).toBeNull();
  });

  it('should only return workouts for the specified user', async () => {
    await storage.workouts.create({
      userId: 'user-a',
      name: 'Workout A',
      date: new Date().toISOString(),
      exercises: [],
      completed: true,
    });
    await storage.workouts.create({
      userId: 'user-b',
      name: 'Workout B',
      date: new Date().toISOString(),
      exercises: [],
      completed: true,
    });

    const userAWorkouts = await storage.workouts.getByUserId('user-a');
    expect(userAWorkouts.every((w: any) => w.userId === 'user-a')).toBe(true);
  });
});

describe('Route: Plan CRUD with ownership', () => {
  let storage: any;

  beforeEach(async () => {
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should create a plan and retrieve it by id', async () => {
    const plan = await storage.workoutPlans.create({
      name: 'PPL Split',
      exercises: [],
      createdBy: 'trainer-test-1',
      assignedTo: [],
    });

    expect(plan.id).toBeDefined();

    const found = await storage.workoutPlans.getById(plan.id);
    expect(found).not.toBeNull();
    expect(found!.createdBy).toBe('trainer-test-1');
    expect(found!.name).toBe('PPL Split');
  });

  it('should return null for non-existent plan', async () => {
    const found = await storage.workoutPlans.getById('non-existent-id');
    expect(found).toBeNull();
  });

  it('should get plans by user id', async () => {
    const plan = await storage.workoutPlans.create({
      name: 'Client Plan',
      exercises: [],
      createdBy: 'trainer-1',
      assignedTo: ['client-test-1'],
      assignedUserId: 'client-test-1',
    });

    const plans = await storage.workoutPlans.getByUserId('client-test-1');
    expect(plans.length).toBeGreaterThanOrEqual(1);
    expect(plans.some((p: any) => p.id === plan.id)).toBe(true);
  });
});

describe('Route: Gamification', () => {
  let storage: any;

  beforeEach(async () => {
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should sync and retrieve gamification data', async () => {
    await storage.gamification.sync('gami-user-1', {
      xp: 500,
      level: 3,
      badges: [{ id: 'first-workout', unlockedAt: new Date().toISOString() }],
      currentStreak: 5,
      longestStreak: 10,
      streakFreezes: 2,
      streakFreezesUsed: [],
      lastActiveDate: new Date().toISOString().split('T')[0],
      coachingTone: 'motivator',
    });

    const data = await storage.gamification.get('gami-user-1');
    expect(data).not.toBeNull();
    expect(data.xp).toBe(500);
    expect(data.level).toBe(3);
    expect(data.currentStreak).toBe(5);
  });

  it('should return leaderboard sorted by XP', async () => {
    await storage.gamification.sync('lb-user-1', {
      xp: 100, level: 1, badges: [], currentStreak: 0, longestStreak: 0,
      streakFreezes: 2, streakFreezesUsed: [], lastActiveDate: '', coachingTone: 'motivator',
    });
    await storage.gamification.sync('lb-user-2', {
      xp: 500, level: 3, badges: [], currentStreak: 0, longestStreak: 0,
      streakFreezes: 2, streakFreezesUsed: [], lastActiveDate: '', coachingTone: 'motivator',
    });

    const leaderboard = await storage.gamification.leaderboard(10);
    expect(leaderboard.length).toBeGreaterThanOrEqual(2);
    // Should be sorted by XP descending
    for (let i = 1; i < leaderboard.length; i++) {
      expect(leaderboard[i - 1].xp).toBeGreaterThanOrEqual(leaderboard[i].xp);
    }
  });
});

describe('Route: Challenges', () => {
  let storage: any;

  beforeEach(async () => {
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should create a challenge and join it', async () => {
    const challenge = await storage.challenges.create({
      name: 'Januar Challenge',
      description: '20 Workouts im Januar',
      type: 'workout_count',
      target: 20,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      createdBy: 'trainer-1',
    });

    expect(challenge.id).toBeDefined();

    const joined = await storage.challenges.join(challenge.id, 'client-1');
    expect(joined).toBe(true);

    await storage.challenges.updateProgress(challenge.id, 'client-1', 5);

    const progress = await storage.challenges.getProgress(challenge.id);
    expect(progress.length).toBeGreaterThanOrEqual(1);
    expect(progress[0].currentValue).toBe(5);
  });

  it('should list active challenges', async () => {
    await storage.challenges.create({
      name: 'Active Challenge',
      description: 'Test',
      type: 'streak',
      target: 7,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdBy: 'trainer-1',
    });

    const active = await storage.challenges.getActive();
    expect(active.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Route: Routines', () => {
  let storage: any;

  beforeEach(async () => {
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should create, list, update, and delete a routine', async () => {
    const routine = await storage.routines.create({
      userId: 'routine-user-1',
      name: 'Morgen-Routine',
      exercises: [{ exerciseId: 'push-ups', sets: 3, reps: 15 }],
    });

    expect(routine.id).toBeDefined();

    const list = await storage.routines.getByUserId('routine-user-1');
    expect(list.length).toBeGreaterThanOrEqual(1);

    const updated = await storage.routines.update(routine.id, { name: 'Abend-Routine' });
    expect(updated).toBe(true);

    const deleted = await storage.routines.delete(routine.id);
    expect(deleted).toBe(true);
  });
});

describe('Route: Measurements', () => {
  let storage: any;

  beforeEach(async () => {
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should create and list measurements', async () => {
    await storage.measurements.create({
      userId: 'measure-user-1',
      date: new Date().toISOString(),
      measurements: { weight: 80, bodyFat: 15 },
    });

    const list = await storage.measurements.getByUserId('measure-user-1');
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].measurements.weight).toBe(80);
  });
});

describe('Route: Password Reset', () => {
  let storage: any;

  beforeEach(async () => {
    const mod = await import('../backend/storage');
    storage = mod.storage;
  });

  it('should create, validate, and consume a reset token', async () => {
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    await storage.passwordResets.create('admin-1', 'test-token-123', expiresAt);

    const valid = await storage.passwordResets.validate('test-token-123');
    expect(valid).not.toBeNull();
    expect(valid!.userId).toBe('admin-1');

    await storage.passwordResets.markUsed('test-token-123');

    const invalid = await storage.passwordResets.validate('test-token-123');
    expect(invalid).toBeNull();
  });

  it('should reject expired tokens', async () => {
    const expiredAt = new Date(Date.now() - 1000).toISOString();
    await storage.passwordResets.create('admin-1', 'expired-token', expiredAt);

    const result = await storage.passwordResets.validate('expired-token');
    expect(result).toBeNull();
  });
});
