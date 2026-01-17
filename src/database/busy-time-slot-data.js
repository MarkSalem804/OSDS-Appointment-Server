const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Mark a time slot as busy
 * @param {Date} date - The date
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @param {string} reason - Optional reason
 * @returns {Promise<object>} - Created busy time slot record
 */
async function markTimeSlotAsBusy(date, startTime, endTime, reason = null) {
  try {
    // Normalize date to start of day (local time)
    // Extract year, month, day to ensure local date interpretation
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();

    // Create date at UTC midnight to avoid timezone conversion issues when storing to MySQL @db.Date
    // This ensures the date stored in the database matches the intended date regardless of server timezone
    const normalizedDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

    // Extract time components from startTime and endTime in local time
    // This ensures we preserve the correct local time even if the Date objects
    // were created from ISO strings (UTC)
    const startTimeObj = new Date(startTime);
    const startHours = startTimeObj.getHours();
    const startMinutes = startTimeObj.getMinutes();
    const startSeconds = startTimeObj.getSeconds();
    // Create startTime with the correct date and time in local timezone
    const normalizedStartTime = new Date(
      year,
      month,
      day,
      startHours,
      startMinutes,
      startSeconds,
      0
    );

    const endTimeObj = new Date(endTime);
    const endHours = endTimeObj.getHours();
    const endMinutes = endTimeObj.getMinutes();
    const endSeconds = endTimeObj.getSeconds();
    // Create endTime with the correct date and time in local timezone
    const normalizedEndTime = new Date(
      year,
      month,
      day,
      endHours,
      endMinutes,
      endSeconds,
      0
    );

    // Use normalizedDate (UTC midnight) for the date field
    // This ensures MySQL stores the correct date without timezone shifts
    const busyTimeSlot = await prisma.busyTimeSlot.create({
      data: {
        date: normalizedDate,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        reason: reason,
      },
    });

    return busyTimeSlot;
  } catch (error) {
    throw new Error("Error marking time slot as busy: " + error.message);
  }
}

/**
 * Unmark a time slot as busy (remove from busy time slots)
 * @param {number} id - The ID of the busy time slot to remove
 * @returns {Promise<object>} - Deleted busy time slot record
 */
async function unmarkTimeSlotAsBusy(id) {
  try {
    const busyTimeSlot = await prisma.busyTimeSlot.delete({
      where: { id: id },
    });

    return busyTimeSlot;
  } catch (error) {
    // If record doesn't exist, that's okay - return null
    if (error.code === "P2025") {
      return null;
    }
    throw new Error("Error unmarking time slot as busy: " + error.message);
  }
}

/**
 * Check if a time slot overlaps with any busy time slots
 * @param {Date} date - The date to check
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @returns {Promise<boolean>} - True if the time slot overlaps with any busy time slot
 */
async function isTimeSlotBusy(date, startTime, endTime) {
  try {
    // Normalize date to UTC midnight to match how dates are stored
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();
    const normalizedDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

    // Get all busy time slots for this date
    const busyTimeSlots = await prisma.busyTimeSlot.findMany({
      where: {
        date: normalizedDate,
      },
    });

    // Check if the requested time slot overlaps with any busy time slot
    for (const busySlot of busyTimeSlots) {
      const busyStart = new Date(busySlot.startTime);
      const busyEnd = new Date(busySlot.endTime);

      // Check for overlap: requested start < busy end AND requested end > busy start
      if (startTime < busyEnd && endTime > busyStart) {
        return true;
      }
    }

    return false;
  } catch (error) {
    throw new Error("Error checking if time slot is busy: " + error.message);
  }
}

/**
 * Get all busy time slots for a date
 * @param {Date} date - The date to get busy time slots for
 * @returns {Promise<Array>} - Array of busy time slot records
 */
async function getBusyTimeSlotsForDate(date) {
  try {
    // Normalize date to UTC midnight to match how dates are stored
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();

    // Create start and end of day in UTC to match how dates are stored
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    // Query using date range to handle timezone and @db.Date field correctly
    // @db.Date stores only the date part, so we use a range to ensure we get all records
    const busyTimeSlots = await prisma.busyTimeSlot.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    console.log(
      `Query for date ${year}-${month + 1}-${day}: Found ${
        busyTimeSlots.length
      } busy time slots`
    );
    return busyTimeSlots;
  } catch (error) {
    throw new Error("Error getting busy time slots for date: " + error.message);
  }
}

/**
 * Get all busy time slots within a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Array of busy time slot records
 */
async function getAllBusyTimeSlots(startDate = null, endDate = null) {
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

    const busyTimeSlots = await prisma.busyTimeSlot.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return busyTimeSlots;
  } catch (error) {
    throw new Error("Error getting all busy time slots: " + error.message);
  }
}

module.exports = {
  markTimeSlotAsBusy,
  unmarkTimeSlotAsBusy,
  isTimeSlotBusy,
  getBusyTimeSlotsForDate,
  getAllBusyTimeSlots,
};
