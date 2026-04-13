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
import * as coursesAdmin from "./routes/courses/admin";
import * as coursesTrainer from "./routes/courses/trainer";
import * as coursesCustomer from "./routes/courses/customer";

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
  courses: createTRPCRouter({
    admin: createTRPCRouter({
      createCourse: coursesAdmin.createCourse,
      updateCourse: coursesAdmin.updateCourse,
      listCourses: coursesAdmin.listCourses,
      deleteCourse: coursesAdmin.deleteCourse,
      createSchedule: coursesAdmin.createSchedule,
      listSchedules: coursesAdmin.listSchedules,
      updateSchedule: coursesAdmin.updateSchedule,
      deleteSchedule: coursesAdmin.deleteSchedule,
      createInstance: coursesAdmin.createInstance,
      listInstances: coursesAdmin.listInstances,
      cancelInstance: coursesAdmin.cancelInstance,
      deleteInstance: coursesAdmin.deleteInstance,
      getInstanceLog: coursesAdmin.getInstanceLog,
      listPenalties: coursesAdmin.listPenalties,
      resetNoShowCount: coursesAdmin.resetNoShowCount,
      cancelBookingAsAdmin: coursesAdmin.cancelBookingAsAdmin,
      generateNow: coursesAdmin.generateNow,
    }),
    trainer: createTRPCRouter({
      listMyInstances: coursesTrainer.listMyInstances,
      getMyInstance: coursesTrainer.getMyInstance,
      markNoShow: coursesTrainer.markNoShow,
      removeParticipant: coursesTrainer.removeParticipant,
    }),
    customer: createTRPCRouter({
      getSchedule: coursesCustomer.getSchedule,
      book: coursesCustomer.book,
      cancelMyBooking: coursesCustomer.cancelMyBooking,
      joinWaitlist: coursesCustomer.joinWaitlist,
      leaveWaitlist: coursesCustomer.leaveWaitlist,
      myBookings: coursesCustomer.myBookings,
    }),
  }),
});

export type AppRouter = typeof appRouter;