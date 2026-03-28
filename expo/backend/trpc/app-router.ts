import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import createClient from "./routes/clients/create";
import listClients from "./routes/clients/list";
import deleteClient from "./routes/clients/delete";
import createInvitation from "./routes/invitations/create";
import listInvitations from "./routes/invitations/list";
import { loginProcedure } from "./routes/auth/login";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    login: loginProcedure,
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
});

export type AppRouter = typeof appRouter;