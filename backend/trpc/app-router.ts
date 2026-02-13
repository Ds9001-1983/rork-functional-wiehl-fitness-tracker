import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import createClient from "./routes/clients/create";
import listClients from "./routes/clients/list";
import deleteClient from "./routes/clients/delete";
import updateClient from "./routes/clients/update";
import createInvitation from "./routes/invitations/create";
import listInvitations from "./routes/invitations/list";
import { loginProcedure } from "./routes/auth/login";
import { updatePasswordProcedure } from "./routes/auth/update-password";
import requestReset from "./routes/auth/request-reset";
import resetPassword from "./routes/auth/reset-password";
import createWorkout from "./routes/workouts/create";
import listWorkouts from "./routes/workouts/list";
import updateWorkout from "./routes/workouts/update";
import deleteWorkout from "./routes/workouts/delete";
import createPlan from "./routes/plans/create";
import listPlans from "./routes/plans/list";
import updatePlan from "./routes/plans/update";
import deletePlan from "./routes/plans/delete";
import assignPlan from "./routes/plans/assign";
import updateProfile from "./routes/profile/update";
import adminStats from "./routes/admin/stats";
import adminUsers from "./routes/admin/users";
import createMeasurement from "./routes/measurements/create";
import listMeasurements from "./routes/measurements/list";
import getGamification from "./routes/gamification/get";
import syncGamification from "./routes/gamification/sync";
import leaderboard from "./routes/gamification/leaderboard";
import createRoutine from "./routes/routines/create";
import listRoutines from "./routes/routines/list";
import updateRoutine from "./routes/routines/update";
import deleteRoutine from "./routes/routines/delete";
import createChallenge from "./routes/challenges/create";
import listChallenges from "./routes/challenges/list";
import joinChallenge from "./routes/challenges/join";
import challengeProgress from "./routes/challenges/progress";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    login: loginProcedure,
    updatePassword: updatePasswordProcedure,
    requestReset: requestReset,
    resetPassword: resetPassword,
  }),
  clients: createTRPCRouter({
    create: createClient,
    list: listClients,
    delete: deleteClient,
    update: updateClient,
  }),
  invitations: createTRPCRouter({
    create: createInvitation,
    list: listInvitations,
  }),
  workouts: createTRPCRouter({
    create: createWorkout,
    list: listWorkouts,
    update: updateWorkout,
    delete: deleteWorkout,
  }),
  plans: createTRPCRouter({
    create: createPlan,
    list: listPlans,
    update: updatePlan,
    delete: deletePlan,
    assign: assignPlan,
  }),
  profile: createTRPCRouter({
    update: updateProfile,
  }),
  admin: createTRPCRouter({
    stats: adminStats,
    users: adminUsers,
  }),
  measurements: createTRPCRouter({
    create: createMeasurement,
    list: listMeasurements,
  }),
  gamification: createTRPCRouter({
    get: getGamification,
    sync: syncGamification,
    leaderboard: leaderboard,
  }),
  routines: createTRPCRouter({
    create: createRoutine,
    list: listRoutines,
    update: updateRoutine,
    delete: deleteRoutine,
  }),
  challenges: createTRPCRouter({
    create: createChallenge,
    list: listChallenges,
    join: joinChallenge,
    progress: challengeProgress,
  }),
});

export type AppRouter = typeof appRouter;
