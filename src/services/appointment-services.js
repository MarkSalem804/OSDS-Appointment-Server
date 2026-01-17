const appointmentDataModule = require("../database/appointment-data");

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
    // Validate required fields
    if (!appointmentData.fullName || !appointmentData.fullName.trim()) {
      throw new Error("Full name is required");
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

    // Parse dates
    const appointmentDate = new Date(appointmentData.appointmentDate);
    const startTime = new Date(appointmentData.appointmentStartTime);
    const endTime = new Date(appointmentData.appointmentEndTime);
    const requestTime = new Date(); // Current time when request is made

    // Validate that start time is before end time
    if (startTime >= endTime) {
      throw new Error("Start time must be before end time");
    }

    // Validate that start and end times are on the same date as appointment date
    const appointmentDateOnly = new Date(appointmentDate);
    appointmentDateOnly.setHours(0, 0, 0, 0);
    const startDateOnly = new Date(startTime);
    startDateOnly.setHours(0, 0, 0, 0);
    const endDateOnly = new Date(endTime);
    endDateOnly.setHours(0, 0, 0, 0);

    if (
      startDateOnly.getTime() !== appointmentDateOnly.getTime() ||
      endDateOnly.getTime() !== appointmentDateOnly.getTime()
    ) {
      throw new Error(
        "Start time and end time must be on the same date as the appointment date"
      );
    }

    // Validate deadline (2:00 PM on weekdays)
    validateDeadline(appointmentDate, requestTime);

    // Check if appointment overlaps with lunch break (12:00 PM - 1:00 PM)
    if (overlapsLunchBreak(startTime, endTime)) {
      throw new Error(
        "Appointments cannot be scheduled during lunch break (12:00 PM - 1:00 PM). Please choose a different time."
      );
    }

    // Check if the day is marked as busy
    const busyDayDataModule = require("../database/busy-day-data");
    const isBusy = await busyDayDataModule.isDayBusy(appointmentDate);
    if (isBusy) {
      throw new Error(
        "This day is marked as busy. Appointments cannot be scheduled on this date."
      );
    }

    // Check if the time slot is marked as busy
    const busyTimeSlotDataModule = require("../database/busy-time-slot-data");
    const isTimeSlotBusy = await busyTimeSlotDataModule.isTimeSlotBusy(
      appointmentDate,
      startTime,
      endTime
    );
    if (isTimeSlotBusy) {
      throw new Error(
        "This time slot is marked as busy. Appointments cannot be scheduled during this time."
      );
    }

    // Check for conflicting appointments
    const conflictingAppointments =
      await appointmentDataModule.findConflictingAppointments(
        appointmentDate,
        startTime,
        endTime
      );

    if (conflictingAppointments.length > 0) {
      const conflict = conflictingAppointments[0];
      const conflictStart = new Date(
        conflict.appointmentStartTime
      ).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const conflictEnd = new Date(
        conflict.appointmentEndTime
      ).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      throw new Error(
        `Time slot conflict: There is already an appointment scheduled from ${conflictStart} to ${conflictEnd} on this date. Please choose a different time.`
      );
    }

    // Create appointment
    const newAppointment = await appointmentDataModule.createAppointment({
      userId: appointmentData.userId || null,
      unitId: appointmentData.unitId,
      fullName: appointmentData.fullName.trim(),
      appointmentDate: appointmentDate,
      appointmentStartTime: startTime,
      appointmentEndTime: endTime,
      appointmentStatus: appointmentData.appointmentStatus || "pending",
      createdBy: appointmentData.createdBy || null,
      agenda: appointmentData.agenda || null,
    });

    return newAppointment;
  } catch (error) {
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

    // Check if appointment exists
    const existingAppointment = await appointmentDataModule.findAppointmentById(
      id
    );
    if (!existingAppointment) {
      throw new Error("Appointment not found");
    }

    // Use existing values if not provided
    const appointmentDate = appointmentData.appointmentDate
      ? new Date(appointmentData.appointmentDate)
      : new Date(existingAppointment.appointmentDate);
    const startTime = appointmentData.appointmentStartTime
      ? new Date(appointmentData.appointmentStartTime)
      : new Date(existingAppointment.appointmentStartTime);
    const endTime = appointmentData.appointmentEndTime
      ? new Date(appointmentData.appointmentEndTime)
      : new Date(existingAppointment.appointmentEndTime);
    const requestTime = new Date(); // Current time when request is made

    // Validate that start time is before end time
    if (startTime >= endTime) {
      throw new Error("Start time must be before end time");
    }

    // Validate that start and end times are on the same date as appointment date
    const appointmentDateOnly = new Date(appointmentDate);
    appointmentDateOnly.setHours(0, 0, 0, 0);
    const startDateOnly = new Date(startTime);
    startDateOnly.setHours(0, 0, 0, 0);
    const endDateOnly = new Date(endTime);
    endDateOnly.setHours(0, 0, 0, 0);

    if (
      startDateOnly.getTime() !== appointmentDateOnly.getTime() ||
      endDateOnly.getTime() !== appointmentDateOnly.getTime()
    ) {
      throw new Error(
        "Start time and end time must be on the same date as the appointment date"
      );
    }

    // Validate deadline (2:00 PM on weekdays) - only if date or time is being changed
    if (
      appointmentData.appointmentDate ||
      appointmentData.appointmentStartTime ||
      appointmentData.appointmentEndTime
    ) {
      validateDeadline(appointmentDate, requestTime);

      // Check if appointment overlaps with lunch break (12:00 PM - 1:00 PM)
      if (overlapsLunchBreak(startTime, endTime)) {
        throw new Error(
          "Appointments cannot be scheduled during lunch break (12:00 PM - 1:00 PM). Please choose a different time."
        );
      }

      // Check if the day is marked as busy
      const busyDayDataModule = require("../database/busy-day-data");
      const isBusy = await busyDayDataModule.isDayBusy(appointmentDate);
      if (isBusy) {
        throw new Error(
          "This day is marked as busy. Appointments cannot be scheduled on this date."
        );
      }

      // Check if the time slot is marked as busy
      const busyTimeSlotDataModule = require("../database/busy-time-slot-data");
      const isTimeSlotBusy = await busyTimeSlotDataModule.isTimeSlotBusy(
        appointmentDate,
        startTime,
        endTime
      );
      if (isTimeSlotBusy) {
        throw new Error(
          "This time slot is marked as busy. Appointments cannot be scheduled during this time."
        );
      }
    }

    // Check for conflicting appointments (excluding the current appointment)
    const conflictingAppointments =
      await appointmentDataModule.findConflictingAppointments(
        appointmentDate,
        startTime,
        endTime,
        id // Exclude current appointment from conflict check
      );

    if (conflictingAppointments.length > 0) {
      const conflict = conflictingAppointments[0];
      const conflictStart = new Date(
        conflict.appointmentStartTime
      ).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const conflictEnd = new Date(
        conflict.appointmentEndTime
      ).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      throw new Error(
        `Time slot conflict: There is already an appointment scheduled from ${conflictStart} to ${conflictEnd} on this date. Please choose a different time.`
      );
    }

    // Update appointment
    const updatedAppointment = await appointmentDataModule.updateAppointment(
      id,
      {
        appointmentDate: appointmentData.appointmentDate
          ? appointmentDate
          : existingAppointment.appointmentDate,
        appointmentStartTime: appointmentData.appointmentStartTime
          ? startTime
          : existingAppointment.appointmentStartTime,
        appointmentEndTime: appointmentData.appointmentEndTime
          ? endTime
          : existingAppointment.appointmentEndTime,
        appointmentStatus: appointmentData.appointmentStatus,
        unitId: appointmentData.unitId,
        userId:
          appointmentData.userId !== undefined
            ? appointmentData.userId
            : existingAppointment.userId,
        fullName:
          appointmentData.fullName !== undefined
            ? appointmentData.fullName.trim() || null
            : existingAppointment.fullName,
        agenda:
          appointmentData.agenda !== undefined
            ? appointmentData.agenda || null
            : existingAppointment.agenda,
      }
    );

    return updatedAppointment;
  } catch (error) {
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
