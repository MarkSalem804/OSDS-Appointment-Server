const appointmentDataModule = require("../database/appointment-data");
const sendEmail = require("../middlewares/sendEmail");

/**
 * Check if a date is a weekday (Monday-Friday)
 * @param {Date} date - Date to check
 * @returns {boolean} - True if weekday, false otherwise
 */
function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday = 1, Friday = 5
}

/**
 * Check if current time is before 2:00 PM
 * @param {Date} dateTime - Date and time to check
 * @returns {boolean} - True if before 2:00 PM, false otherwise
 */
function isBeforeDeadline(dateTime) {
  const deadline = new Date(dateTime);
  deadline.setHours(14, 0, 0, 0); // 2:00 PM
  return dateTime < deadline;
}

/**
 * Check if appointment time overlaps with lunch break (12:00 PM - 1:00 PM)
 * @param {Date} startTime - Appointment start time
 * @param {Date} endTime - Appointment end time
 * @returns {boolean} - True if overlaps with lunch break, false otherwise
 */
function overlapsLunchBreak(startTime, endTime) {
  const lunchStart = new Date(startTime);
  lunchStart.setHours(12, 0, 0, 0); // 12:00 PM
  const lunchEnd = new Date(startTime);
  lunchEnd.setHours(13, 0, 0, 0); // 1:00 PM

  // Check if appointment overlaps with lunch break
  // Overlap occurs if: startTime < lunchEnd AND endTime > lunchStart
  return startTime < lunchEnd && endTime > lunchStart;
}

/**
 * Validate appointment deadline (2:00 PM on weekdays)
 * @param {Date} appointmentDate - The appointment date
 * @param {Date} requestTime - The time when the request is being made (defaults to now)
 * @throws {Error} - If deadline validation fails
 */
function validateDeadline(appointmentDate, requestTime = new Date()) {
  // Check if appointment date is a weekday
  if (!isWeekday(appointmentDate)) {
    throw new Error(
      "Appointments can only be scheduled on weekdays (Monday-Friday)"
    );
  }

  // If scheduling for today, check if it's before 2:00 PM
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appointmentDateOnly = new Date(appointmentDate);
  appointmentDateOnly.setHours(0, 0, 0, 0);

  // If the appointment is for today, check deadline
  if (appointmentDateOnly.getTime() === today.getTime()) {
    if (!isBeforeDeadline(requestTime)) {
      throw new Error(
        "Appointments cannot be scheduled after 2:00 PM on weekdays. Please schedule for a future date."
      );
    }
  }
}

/**
 * Get all appointments with optional filtering
 * @param {object} options - Query options
 * @returns {Promise<Array>} - Array of appointments
 */
async function getAllAppointments(options = {}) {
  try {
    const appointments = await appointmentDataModule.findAllAppointments(
      options
    );
    return appointments;
  } catch (error) {
    throw new Error("Error getting all appointments: " + error.message);
  }
}

/**
 * Get appointment by ID
 * @param {number} id - Appointment ID
 * @returns {Promise<object>} - Appointment object
 */
async function getAppointmentById(id) {
  try {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    const appointment = await appointmentDataModule.findAppointmentById(id);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    return appointment;
  } catch (error) {
    throw new Error("Error getting appointment by id: " + error.message);
  }
}

/**
 * Create a new appointment with conflict checking and deadline validation
 * @param {object} appointmentData - Appointment data
 * @returns {Promise<object>} - Created appointment
 */
async function createAppointment(appointmentData) {
  try {
    console.log("📥 Received appointment data (service):", appointmentData);

    // Validate required fields again (safety net)
    if (!appointmentData.fullName || !appointmentData.fullName.trim()) {
      throw new Error("Full name is required");
    }
    if (!appointmentData.email) {
      throw new Error("DepEd email is required");
    }
    if (!appointmentData.unitId) {
      throw new Error("Unit ID is required");
    }
    if (!appointmentData.appointmentDate) {
      throw new Error("Appointment date is required");
    }
    if (!appointmentData.appointmentStartTime) {
      throw new Error("Appointment start time is required");
    }
    if (!appointmentData.appointmentEndTime) {
      throw new Error("Appointment end time is required");
    }

    const appointmentDate = new Date(appointmentData.appointmentDate);
    const startTime = new Date(appointmentData.appointmentStartTime);
    const endTime = new Date(appointmentData.appointmentEndTime);
    const requestTime = new Date();

    console.log("⏳ Parsed Dates:", {
      appointmentDate,
      startTime,
      endTime,
      requestTime,
    });

    if (startTime >= endTime) {
      throw new Error("Start time must be before end time");
    }

    // Helper function to get UTC date only (midnight UTC)
    function getUTCDateOnly(date) {
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }

    const appointmentDateUTC = getUTCDateOnly(appointmentDate);
    const startDateUTC = getUTCDateOnly(startTime);
    const endDateUTC = getUTCDateOnly(endTime);

    console.log("📅 UTC Dates for Validation:", {
      appointmentDateUTC,
      startDateUTC,
      endDateUTC,
    });

    if (startDateUTC !== appointmentDateUTC || endDateUTC !== appointmentDateUTC) {
      throw new Error("Start time and end time must be on the same date as the appointment date");
    }

    // You can uncomment and add your other validation calls here:
    // validateDeadline(appointmentDate, requestTime);
    // if (overlapsLunchBreak(startTime, endTime)) throw new Error("Appointments cannot be scheduled during lunch break");
    // const isBusy = await busyDayDataModule.isDayBusy(appointmentDate);
    // if (isBusy) throw new Error("This day is marked as busy");
    // const isTimeSlotBusy = await busyTimeSlotDataModule.isTimeSlotBusy(appointmentDate, startTime, endTime);
    // if (isTimeSlotBusy) throw new Error("This time slot is marked as busy");
    // const conflictingAppointments = await appointmentDataModule.findConflictingAppointments(appointmentDate, startTime, endTime);
    // if (conflictingAppointments.length > 0) throw new Error("Time slot conflict detected");

    // Create appointment in DB
    const newAppointment = await appointmentDataModule.createAppointment({
      userId: appointmentData.userId || null,
      email: appointmentData.email || null,
      unitId: appointmentData.unitId,
      fullName: appointmentData.fullName.trim(),
      appointmentDate: appointmentDate,
      appointmentStartTime: startTime,
      appointmentEndTime: endTime,
      appointmentStatus: appointmentData.appointmentStatus || "pending",
      createdBy: appointmentData.createdBy || null,
      agenda: appointmentData.agenda || null,
    });

    console.log("✅ Appointment created:", newAppointment);

    return newAppointment;
  } catch (error) {
    console.error("❌ Error in createAppointment service:", error.message);
    throw new Error("Error creating appointment: " + error.message);
  }
}





/**
 * Update appointment with conflict checking and deadline validation
 * @param {number} id - Appointment ID
 * @param {object} appointmentData - Appointment data to update
 * @returns {Promise<object>} - Updated appointment
 */
async function updateAppointment(id, appointmentData) {
  try {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    // Fetch existing appointment
    const existingAppointment = await appointmentDataModule.findAppointmentById(id);
    if (!existingAppointment) {
      throw new Error("Appointment not found");
    }

    console.log("📥 Received appointment data (service):", appointmentData);
    console.log("📥 Existing appointment data:", existingAppointment);

    // Use updated or existing start/end times
    const startTime = appointmentData.appointmentStartTime
      ? new Date(appointmentData.appointmentStartTime)
      : new Date(existingAppointment.appointmentStartTime);
    const endTime = appointmentData.appointmentEndTime
      ? new Date(appointmentData.appointmentEndTime)
      : new Date(existingAppointment.appointmentEndTime);

    // Derive appointmentDate from startTime, forcing UTC midnight
    const derivedAppointmentDate = new Date(Date.UTC(
      startTime.getUTCFullYear(),
      startTime.getUTCMonth(),
      startTime.getUTCDate(),
      0, 0, 0, 0
    ));

    const requestTime = new Date(); // Current request time

    console.log("⏳ Parsed Dates:", {
      appointmentDate: derivedAppointmentDate,
      startTime,
      endTime,
      requestTime,
    });

    // Validate start < end
    if (startTime >= endTime) {
      throw new Error("Start time must be before end time");
    }

    // Validate start/end times are on the same date as appointmentDate (UTC)
    const appointmentDateUTC = derivedAppointmentDate.getTime();
    const startDateUTC = Date.UTC(startTime.getUTCFullYear(), startTime.getUTCMonth(), startTime.getUTCDate());
    const endDateUTC = Date.UTC(endTime.getUTCFullYear(), endTime.getUTCMonth(), endTime.getUTCDate());

    console.log("📅 UTC Dates for Validation:", {
      appointmentDateUTC,
      startDateUTC,
      endDateUTC,
    });

    if (startDateUTC !== appointmentDateUTC || endDateUTC !== appointmentDateUTC) {
      throw new Error("Start time and end time must be on the same date as the appointment date");
    }

    // Validate deadline, lunch break, busy days, busy slots
    if (
      appointmentData.appointmentDate ||
      appointmentData.appointmentStartTime ||
      appointmentData.appointmentEndTime
    ) {
      validateDeadline(derivedAppointmentDate, requestTime);

      if (overlapsLunchBreak(startTime, endTime)) {
        throw new Error(
          "Appointments cannot be scheduled during lunch break (12:00 PM - 1:00 PM). Please choose a different time."
        );
      }

      const busyDayDataModule = require("../database/busy-day-data");
      const isBusy = await busyDayDataModule.isDayBusy(derivedAppointmentDate);
      if (isBusy) {
        throw new Error(
          "This day is marked as busy. Appointments cannot be scheduled on this date."
        );
      }

      const busyTimeSlotDataModule = require("../database/busy-time-slot-data");
      const isTimeSlotBusy = await busyTimeSlotDataModule.isTimeSlotBusy(
        derivedAppointmentDate,
        startTime,
        endTime
      );
      if (isTimeSlotBusy) {
        throw new Error(
          "This time slot is marked as busy. Appointments cannot be scheduled during this time."
        );
      }
    }

    // Check for conflicting appointments excluding current
    const conflictingAppointments = await appointmentDataModule.findConflictingAppointments(
      derivedAppointmentDate,
      startTime,
      endTime,
      id // exclude this appointment
    );

    if (conflictingAppointments.length > 0) {
      const conflict = conflictingAppointments[0];
      const conflictStart = new Date(conflict.appointmentStartTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const conflictEnd = new Date(conflict.appointmentEndTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      throw new Error(
        `Time slot conflict: There is already an appointment scheduled from ${conflictStart} to ${conflictEnd} on this date. Please choose a different time.`
      );
    }

    // Update appointment in DB
    const updatedAppointment = await appointmentDataModule.updateAppointment(id, {
      appointmentDate: derivedAppointmentDate,
      appointmentStartTime: appointmentData.appointmentStartTime ? startTime : existingAppointment.appointmentStartTime,
      appointmentEndTime: appointmentData.appointmentEndTime ? endTime : existingAppointment.appointmentEndTime,
      appointmentStatus: appointmentData.appointmentStatus,
      unitId: appointmentData.unitId,
      userId: appointmentData.userId !== undefined ? appointmentData.userId : existingAppointment.userId,
      fullName: appointmentData.fullName !== undefined ? appointmentData.fullName.trim() || null : existingAppointment.fullName,
      email: appointmentData.email !== undefined ? appointmentData.email || null : existingAppointment.email,
      agenda: appointmentData.agenda !== undefined ? appointmentData.agenda || null : existingAppointment.agenda,
    });

    // === Email notifications ===
    if (updatedAppointment.email) {
      // Only send on status changes or reschedule
      const previousStatus = existingAppointment.appointmentStatus;

      // Approved
      if (appointmentData.appointmentStatus === "approved" && previousStatus !== "approved") {
        await sendEmail(
          updatedAppointment.email,
          "Appointment Approved",
          `
          <p>Good day ${updatedAppointment.fullName || ""},</p>
          <p>Your appointment has been <strong>approved</strong>.</p>
          <p>
            <strong>Date:</strong> ${new Date(updatedAppointment.appointmentDate).toDateString()}<br/>
            <strong>Time:</strong> ${new Date(updatedAppointment.appointmentStartTime).toLocaleTimeString()} - ${new Date(updatedAppointment.appointmentEndTime).toLocaleTimeString()}
          </p>
          <p>Thank you.</p>
        `
        );
      }

      // Rejected
      if (appointmentData.appointmentStatus === "rejected" && previousStatus !== "rejected") {
        await sendEmail(
          updatedAppointment.email,
          "Appointment Rejected",
          `
          <p>Good day ${updatedAppointment.fullName || ""},</p>
          <p>Your appointment has been <strong>rejected</strong>.</p>
          <p>You may submit a new appointment request.</p>
          <p>Thank you.</p>
        `
        );
      }

      // Rescheduled
      const isRescheduled =
        appointmentData.appointmentDate ||
        appointmentData.appointmentStartTime ||
        appointmentData.appointmentEndTime;

      if (isRescheduled) {
        await sendEmail(
          updatedAppointment.email,
          "Appointment Rescheduled",
          `
          <p>Good day ${updatedAppointment.fullName || ""},</p>
          <p>Your appointment has been <strong>rescheduled</strong>.</p>
          <p>
            <strong>New Date:</strong> ${new Date(updatedAppointment.appointmentDate).toDateString()}<br/>
            <strong>New Time:</strong> ${new Date(updatedAppointment.appointmentStartTime).toLocaleTimeString()} - ${new Date(updatedAppointment.appointmentEndTime).toLocaleTimeString()}
          </p>
          <p>Please take note of the updated schedule.</p>
        `
        );
      }
    }

    return updatedAppointment;
  } catch (error) {
    console.error("❌ Error in updateAppointment service:", error.message);
    throw new Error("Error updating appointment: " + error.message);
  }
}


/**
 * Delete appointment (soft delete)
 * @param {number} id - Appointment ID
 * @returns {Promise<object>} - Deleted appointment
 */
async function deleteAppointment(id) {
  try {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    const deletedAppointment = await appointmentDataModule.deleteAppointment(
      id
    );
    return deletedAppointment;
  } catch (error) {
    throw new Error("Error deleting appointment: " + error.message);
  }
}

/**
 * Permanently delete appointment (hard delete)
 * @param {number} id - Appointment ID
 * @returns {Promise<object>} - Deleted appointment
 */
async function hardDeleteAppointment(id) {
  try {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    const deletedAppointment =
      await appointmentDataModule.hardDeleteAppointment(id);
    return deletedAppointment;
  } catch (error) {
    throw new Error("Error permanently deleting appointment: " + error.message);
  }
}

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  hardDeleteAppointment,
};
