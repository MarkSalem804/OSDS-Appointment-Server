const busyDayDataModule = require("../database/busy-day-data");
const appointmentDataModule = require("../database/appointment-data");

/**
 * Mark a day as busy and move existing appointments
 * @param {Date} date - The date to mark as busy
 * @returns {Promise<object>} - Result with busy day and moved appointments
 */
async function markDayAsBusy(date) {
  try {
    // Mark the day as busy
    const busyDay = await busyDayDataModule.markDayAsBusy(date);

    // Get all appointments for this date (approved and pending)
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await appointmentDataModule.findAllAppointments({
      date: normalizedDate,
      isDeleted: false,
    });

    // Filter to only approved and pending appointments
    const activeAppointments = appointments.filter(
      (apt) =>
        apt.appointmentStatus === "approved" ||
        apt.appointmentStatus === "pending"
    );

    // Move each appointment to the next available date
    const movedAppointments = [];
    const failedMoves = [];

    for (const appointment of activeAppointments) {
      try {
        // Find next available date
        const nextDate = await busyDayDataModule.findNextAvailableDate(
          normalizedDate,
          appointment.appointmentStartTime,
          appointment.appointmentEndTime,
          60 // Search up to 60 days ahead
        );

        if (nextDate) {
          // Extract hours and minutes from original times
          const startHours = appointment.appointmentStartTime.getHours();
          const startMinutes = appointment.appointmentStartTime.getMinutes();
          const endHours = appointment.appointmentEndTime.getHours();
          const endMinutes = appointment.appointmentEndTime.getMinutes();

          // Create new times on the next available date
          const newStartTime = new Date(nextDate);
          newStartTime.setHours(startHours, startMinutes, 0, 0);
          const newEndTime = new Date(nextDate);
          newEndTime.setHours(endHours, endMinutes, 0, 0);

          // Update appointment
          const updatedAppointment =
            await appointmentDataModule.updateAppointment(appointment.id, {
              appointmentDate: nextDate,
              appointmentStartTime: newStartTime,
              appointmentEndTime: newEndTime,
            });

          movedAppointments.push(updatedAppointment);
        } else {
          // Could not find available date - mark as rejected
          await appointmentDataModule.updateAppointment(appointment.id, {
            appointmentStatus: "rejected",
          });
          failedMoves.push({
            appointment,
            reason: "No available date found within 60 days",
          });
        }
      } catch (error) {
        console.error(
          `Error moving appointment ${appointment.id}:`,
          error.message
        );
        failedMoves.push({
          appointment,
          reason: error.message,
        });
      }
    }

    return {
      busyDay,
      movedAppointments,
      failedMoves,
      totalMoved: movedAppointments.length,
      totalFailed: failedMoves.length,
    };
  } catch (error) {
    throw new Error("Error marking day as busy: " + error.message);
  }
}

/**
 * Unmark a day as busy
 * @param {Date} date - The date to unmark
 * @returns {Promise<object>} - Unmarked busy day record
 */
async function unmarkDayAsBusy(date) {
  try {
    const busyDay = await busyDayDataModule.unmarkDayAsBusy(date);
    return busyDay;
  } catch (error) {
    throw new Error("Error unmarking day as busy: " + error.message);
  }
}

/**
 * Check if a day is busy
 * @param {Date} date - The date to check
 * @returns {Promise<boolean>} - True if the day is busy
 */
async function isDayBusy(date) {
  try {
    return await busyDayDataModule.isDayBusy(date);
  } catch (error) {
    throw new Error("Error checking if day is busy: " + error.message);
  }
}

/**
 * Get all busy days
 * @param {Date} startDate - Optional start date filter
 * @param {Date} endDate - Optional end date filter
 * @returns {Promise<Array>} - Array of busy day records
 */
async function getAllBusyDays(startDate = null, endDate = null) {
  try {
    return await busyDayDataModule.getAllBusyDays(startDate, endDate);
  } catch (error) {
    throw new Error("Error getting all busy days: " + error.message);
  }
}

module.exports = {
  markDayAsBusy,
  unmarkDayAsBusy,
  isDayBusy,
  getAllBusyDays,
};
