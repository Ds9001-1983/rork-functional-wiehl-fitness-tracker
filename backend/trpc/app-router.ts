import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import createClient from "./routes/clients/create";
import listClients from "./routes/clients/list";
import deleteClient from "./routes/clients/delete";
import createInvitation from "./routes/invitations/create";
import listInvitations from "./routes/invitations/list";
import { loginProcedure } from "./routes/auth/login";
import { updatePasswordProcedure } from "./routes/auth/update-password";
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

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    login: loginProcedure,
    updatePassword: updatePasswordProcedure,
  }),
  clients: createTRPCRouter({
    create: createClient,
    list: listClients,
    delete: deleteClient,
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
});

export type AppRouter = typeof appRouter;
