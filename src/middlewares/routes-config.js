const express = require("express");
const userRouter = require("../User Modules/user-routes");
const unitRouter = require("../controllers/unit-routes");
const appointmentRouter = require("../controllers/appointment-routes");
const busyDayRouter = require("../controllers/busy-day-routes");
const busyTimeSlotRouter = require("../controllers/busy-time-slot-routes");

const Routes = (app) => {
  const router = express.Router();

  // API Routes
  router.use("/users", userRouter);
  router.use("/units", unitRouter);
  router.use("/appointments", appointmentRouter);
  router.use("/busyDays", busyDayRouter);
  router.use("/busyTimeSlots", busyTimeSlotRouter);

  // Health check endpoint
  router.get("/health", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Server is running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // Mount all routes under /api prefix
  app.use("/api", router);

  // Root endpoint
  app.get("/", (req, res) => {
    res.status(200).json({
      success: true,
      message: "PMS API Server",
      version: "1.0.0",
      endpoints: {
        health: "/api/health",
        users: {
          login: "/api/users/login",
          register: "POST /api/users/register",
          update: "PUT /api/users/:id",
          requestTemporaryAccount: "/api/users/request-temporary-account",
          changePassword: "/api/users/change-password",
          resetPassword: "POST /api/users/:id/reset-password",
        },
        units: {
          getAll: "GET /api/units",
          getById: "GET /api/units/:id",
          create: "POST /api/units",
          update: "PUT /api/units/:id",
          delete: "DELETE /api/units/:id",
          permanentDelete: "DELETE /api/units/:id/permanent",
        },
        appointments: {
          getAll: "GET /api/appointments/getAllAppointments",
          getById: "GET /api/appointments/getAppointmentById/:id",
          create: "POST /api/appointments/createAppointment",
          update: "PUT /api/appointments/updateAppointment/:id",
          delete: "DELETE /api/appointments/deleteAppointment/:id",
          permanentDelete:
            "DELETE /api/appointments/deleteAppointmentPermanent/:id",
        },
      },
      timestamp: new Date().toISOString(),
    });
  });
};

module.exports = Routes;
