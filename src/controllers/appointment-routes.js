const express = require("express");
const appointmentRouter = express.Router();
const appointmentServices = require("../services/appointment-services");
const { optionalAuth } = require("../middlewares/auth");

// Get all appointments
appointmentRouter.get("/getAllAppointments", async (req, res) => {
  try {
    const options = {};

    if (req.query.status) {
      options.status = req.query.status;
    }

    if (req.query.userId) {
      options.userId = parseInt(req.query.userId);
    }

    if (req.query.unitId) {
      options.unitId = parseInt(req.query.unitId);
    }

    if (req.query.date) {
      options.date = new Date(req.query.date);
    }

    if (req.query.isDeleted !== undefined) {
      options.isDeleted = req.query.isDeleted === "true";
    }

    const appointments = await appointmentServices.getAllAppointments(options);

    console.log(
      `✅ [Appointments] Retrieved ${appointments.length} appointments`
    );

    res.status(200).json({
      success: true,
      message: "Appointments retrieved successfully",
      data: appointments,
      count: appointments.length,
    });
  } catch (error) {
    console.error(
      "❌ [Appointments] Failed to retrieve appointments:",
      error.message
    );
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve appointments",
    });
  }
});

// Get appointment by ID
appointmentRouter.get("/getAppointmentById/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid appointment ID",
      });
    }

    const appointment = await appointmentServices.getAppointmentById(id);

    console.log(`✅ [Appointments] Retrieved appointment ID: ${id}`);

    res.status(200).json({
      success: true,
      message: "Appointment retrieved successfully",
      data: appointment,
    });
  } catch (error) {
    console.error(
      "❌ [Appointments] Failed to retrieve appointment:",
      error.message
    );
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to retrieve appointment",
    });
  }
});

// Create a new appointment
// Uses optionalAuth - if user is authenticated, userId is auto-populated
appointmentRouter.post("/createAppointment", optionalAuth, async (req, res) => {
  try {
    const {
      userId,
      email,
      fullName,
      unitId,
      appointmentDate,
      appointmentStartTime,
      appointmentEndTime,
      appointmentStatus,
      createdBy,
      agenda,
    } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ success: false, error: "DepEd email is required" });
    }
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, error: "Full name is required" });
    }
    if (!unitId) {
      return res.status(400).json({ success: false, error: "Unit ID is required" });
    }
    if (!appointmentDate) {
      return res.status(400).json({ success: false, error: "Appointment date is required" });
    }
    if (!appointmentStartTime) {
      return res.status(400).json({ success: false, error: "Appointment start time is required" });
    }
    if (!appointmentEndTime) {
      return res.status(400).json({ success: false, error: "Appointment end time is required" });
    }

    // Force appointmentDate to local midnight
    let parsedAppointmentDate;
    if (typeof appointmentDate === "string" && appointmentDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = appointmentDate.split("-").map(Number);
      parsedAppointmentDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // local midnight
    } else {
      const tempDate = new Date(appointmentDate);
      parsedAppointmentDate = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 0, 0, 0, 0);
    }

    const parsedStartTime = new Date(appointmentStartTime);
    const parsedEndTime = new Date(appointmentEndTime);

    // Validation for date correctness
    if (isNaN(parsedAppointmentDate.getTime())) {
      return res.status(400).json({ success: false, error: "Invalid appointment date format" });
    }
    if (isNaN(parsedStartTime.getTime())) {
      return res.status(400).json({ success: false, error: "Invalid appointment start time format" });
    }
    if (isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ success: false, error: "Invalid appointment end time format" });
    }


    const finalUserId = userId
      ? parseInt(userId)
      : req.user
      ? req.user.id
      : null;

  
      console.log("📥 Received appointment data (route):", {
        userId: finalUserId,
        email,
        fullName,
        unitId,
        appointmentDate: parsedAppointmentDate.toISOString(),
        appointmentStartTime: parsedStartTime.toISOString(),
        appointmentEndTime: parsedEndTime.toISOString(),
        appointmentStatus,
        createdBy,
        agenda,
      });

    const appointment = await appointmentServices.createAppointment({
      userId: finalUserId,
      email,
      fullName: fullName.trim(),
      unitId: parseInt(unitId),
      appointmentDate: parsedAppointmentDate,
      appointmentStartTime: parsedStartTime,
      appointmentEndTime: parsedEndTime,
      appointmentStatus: appointmentStatus || "pending",
      createdBy: createdBy || null,
      agenda: agenda || null,
    });

    console.log(`✅ [Appointments] Created appointment ID: ${appointment.id}`);

    res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("❌ [Appointments] Failed to create appointment:", error.message);
    let statusCode = 500;

    if (error.message.includes("required")) statusCode = 400;
    else if (error.message.includes("conflict") || error.message.includes("Time slot")) statusCode = 409;
    else if (error.message.includes("deadline") || error.message.includes("2:00 PM")) statusCode = 400;
    else if (error.message.includes("weekday")) statusCode = 400;

    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to create appointment",
    });
  }
});




// Update appointment
appointmentRouter.put("/updateAppointment/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid appointment ID",
      });
    }

    const {
      appointmentDate,
      appointmentStartTime,
      appointmentEndTime,
      appointmentStatus,
      unitId,
      userId,
      fullName,
      email,
      agenda,
    } = req.body;

    const updateData = {};

    // Parse and normalize appointmentDate to UTC midnight if provided
    if (appointmentDate) {
      let parsedDate;
      if (
        typeof appointmentDate === "string" &&
        appointmentDate.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        const [year, month, day] = appointmentDate.split("-").map(Number);
        parsedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // UTC midnight
      } else {
        parsedDate = new Date(appointmentDate);
      }
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid appointment date format",
        });
      }
      updateData.appointmentDate = parsedDate;
    }

    if (appointmentStartTime) {
      const parsedStartTime = new Date(appointmentStartTime);
      if (isNaN(parsedStartTime.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid appointment start time format",
        });
      }
      updateData.appointmentStartTime = parsedStartTime;
    }

    if (appointmentEndTime) {
      const parsedEndTime = new Date(appointmentEndTime);
      if (isNaN(parsedEndTime.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid appointment end time format",
        });
      }
      updateData.appointmentEndTime = parsedEndTime;
    }

    if (appointmentStatus !== undefined) {
      updateData.appointmentStatus = appointmentStatus;
    }

    if (unitId !== undefined) {
      updateData.unitId = parseInt(unitId);
    }

    if (userId !== undefined) {
      updateData.userId = userId ? parseInt(userId) : null;
    }

    if (email !== undefined) {
      updateData.email = email || null;
    }

    if (fullName !== undefined) {
      updateData.fullName = fullName.trim() || null;
    }

    if (agenda !== undefined) {
      updateData.agenda = agenda || null;
    }

    const appointment = await appointmentServices.updateAppointment(
      id,
      updateData
    );

    console.log(`✅ [Appointments] Updated appointment ID: ${id}`);

    res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      data: appointment,
    });
  } catch (error) {
    console.error(
      "❌ [Appointments] Failed to update appointment:",
      error.message
    );

    let statusCode = 500;
    if (error.message.includes("not found")) statusCode = 404;
    else if (error.message.includes("required")) statusCode = 400;
    else if (
      error.message.includes("conflict") ||
      error.message.includes("Time slot")
    )
      statusCode = 409;
    else if (
      error.message.includes("deadline") ||
      error.message.includes("2:00 PM")
    )
      statusCode = 400;
    else if (error.message.includes("weekday")) statusCode = 400;

    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to update appointment",
    });
  }
});


// Delete appointment (soft delete)
appointmentRouter.delete("/deleteAppointment/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid appointment ID",
      });
    }

    const appointment = await appointmentServices.deleteAppointment(id);

    console.log(`✅ [Appointments] Deleted appointment ID: ${id}`);

    res.status(200).json({
      success: true,
      message: "Appointment deleted successfully",
      data: appointment,
    });
  } catch (error) {
    console.error(
      "❌ [Appointments] Failed to delete appointment:",
      error.message
    );
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to delete appointment",
    });
  }
});

// Permanently delete appointment (hard delete)
appointmentRouter.delete(
  "/deleteAppointmentPermanent/:id",
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid appointment ID",
        });
      }

      const appointment = await appointmentServices.hardDeleteAppointment(id);

      console.log(
        `✅ [Appointments] Permanently deleted appointment ID: ${id}`
      );

      res.status(200).json({
        success: true,
        message: "Appointment permanently deleted successfully",
        data: appointment,
      });
    } catch (error) {
      console.error(
        "❌ [Appointments] Failed to permanently delete appointment:",
        error.message
      );
      const statusCode = error.message.includes("not found") ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || "Failed to permanently delete appointment",
      });
    }
  }
);

module.exports = appointmentRouter;
