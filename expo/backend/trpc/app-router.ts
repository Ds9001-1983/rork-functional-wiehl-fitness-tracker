import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import createClient from "./routes/clients/create";
import listClients from "./routes/clients/list";
import deleteClient from "./routes/clients/delete";
import createInvitation from "./routes/invitations/create";
import listInvitations from "./routes/invitations/list";
import { loginProcedure } from "./routes/auth/login";
import { changePasswordProcedure } from "./routes/auth/change-password";
import createWorkout from "./routes/workouts/create";
import listWorkouts from "./routes/workouts/list";
import syncWorkouts from "./routes/workouts/sync";
import createPlan from "./routes/plans/create";
import listPlans from "./routes/plans/list";
import assignPlan from "./routes/plans/assign";
import updatePlan from "./routes/plans/update";
import registerPushToken from "./routes/push/register";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    login: loginProcedure,
    changePassword: changePasswordProcedure,
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
    sync: syncWorkouts,
  }),
  plans: createTRPCRouter({
    create: createPlan,
    list: listPlans,
    assign: assignPlan,
    update: updatePlan,
  }),
  push: createTRPCRouter({
    register: registerPushToken,
  }),
});

export type AppRouter = typeof appRouter;