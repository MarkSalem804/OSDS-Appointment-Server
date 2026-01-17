const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Mark a day as busy
 * @param {Date} date - The date to mark as busy
 * @returns {Promise<object>} - Created busy day record
 */
async function markDayAsBusy(date) {
  try {
    // Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const busyDay = await prisma.busyDay.upsert({
      where: { date: normalizedDate },
      update: { date: normalizedDate },
      create: { date: normalizedDate },
    });

    return busyDay;
  } catch (error) {
    throw new Error("Error marking day as busy: " + error.message);
  }
}

/**
 * Unmark a day as busy (remove from busy days)
 * @param {Date} date - The date to unmark
 * @returns {Promise<object>} - Deleted busy day record
 */
async function unmarkDayAsBusy(date) {
  try {
    // Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const busyDay = await prisma.busyDay.delete({
      where: { date: normalizedDate },
    });

    return busyDay;
  } catch (error) {
    // If record doesn't exist, that's okay - return null
    if (error.code === "P2025") {
      return null;
    }
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
    // Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const busyDay = await prisma.busyDay.findUnique({
      where: { date: normalizedDate },
    });

    return !!busyDay;
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
    const where = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        const normalizedStart = new Date(startDate);
        normalizedStart.setHours(0, 0, 0, 0);
        where.date.gte = normalizedStart;
      }
      if (endDate) {
        const normalizedEnd = new Date(endDate);
        normalizedEnd.setHours(23, 59, 59, 999);
        where.date.lte = normalizedEnd;
      }
    }

    const busyDays = await prisma.busyDay.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return busyDays;
  } catch (error) {
    throw new Error("Error getting all busy days: " + error.message);
  }
}

/**
 * Find the next available date (not busy and no conflicts)
 * @param {Date} startDate - Starting date to search from
 * @param {Date} startTime - Start time of the appointment
 * @param {Date} endTime - End time of the appointment
 * @param {number} maxDays - Maximum days to search ahead (default: 30)
 * @returns {Promise<Date|null>} - Next available date or null if not found
 */
async function findNextAvailableDate(
  startDate,
  startTime,
  endTime,
  maxDays = 30
) {
  try {
    const appointmentDataModule = require("./appointment-data");

    // Normalize start date
    const searchDate = new Date(startDate);
    searchDate.setHours(0, 0, 0, 0);

    // Get all busy days
    const endSearchDate = new Date(searchDate);
    endSearchDate.setDate(endSearchDate.getDate() + maxDays);
    const busyDays = await getAllBusyDays(searchDate, endSearchDate);
    const busyDatesSet = new Set(
      busyDays.map((bd) => bd.date.toISOString().split("T")[0])
    );

    // Search for available date
    for (let i = 0; i < maxDays; i++) {
      const checkDate = new Date(searchDate);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split("T")[0];

      // Skip if this date is busy
      if (busyDatesSet.has(dateStr)) {
        continue;
      }

      // Construct new start and end times for this check date
      // Extract hours and minutes from the original start/end times
      const startHours = startTime.getHours();
      const startMinutes = startTime.getMinutes();
      const endHours = endTime.getHours();
      const endMinutes = endTime.getMinutes();

      // Create new Date objects for this check date with the same time
      const checkStartTime = new Date(checkDate);
      checkStartTime.setHours(startHours, startMinutes, 0, 0);
      const checkEndTime = new Date(checkDate);
      checkEndTime.setHours(endHours, endMinutes, 0, 0);

      // Check for time conflicts on this date
      const conflicts = await appointmentDataModule.findConflictingAppointments(
        checkDate,
        checkStartTime,
        checkEndTime
      );

      // If no conflicts, this date is available
      if (conflicts.length === 0) {
        return checkDate;
      }
    }

    return null; // No available date found
  } catch (error) {
    throw new Error("Error finding next available date: " + error.message);
  }
}

module.exports = {
  markDayAsBusy,
  unmarkDayAsBusy,
  isDayBusy,
  getAllBusyDays,
  findNextAvailableDate,
};
