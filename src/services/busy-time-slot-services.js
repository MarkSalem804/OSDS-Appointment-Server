const busyTimeSlotDataModule = require("../database/busy-time-slot-data");

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
    // Validate that endTime is after startTime
    if (endTime <= startTime) {
      throw new Error("End time must be after start time");
    }

    // Check if the time slot overlaps with existing busy time slots
    const isBusy = await busyTimeSlotDataModule.isTimeSlotBusy(
      date,
      startTime,
      endTime
    );

    if (isBusy) {
      throw new Error("This time slot is already marked as busy");
    }

    const busyTimeSlot = await busyTimeSlotDataModule.markTimeSlotAsBusy(
      date,
      startTime,
      endTime,
      reason
    );

    return busyTimeSlot;
  } catch (error) {
    throw new Error("Error marking time slot as busy: " + error.message);
  }
}

/**
 * Unmark a time slot as busy
 * @param {number} id - The ID of the busy time slot to remove
 * @returns {Promise<object>} - Deleted busy time slot record
 */
async function unmarkTimeSlotAsBusy(id) {
  try {
    const busyTimeSlot = await busyTimeSlotDataModule.unmarkTimeSlotAsBusy(id);

    if (!busyTimeSlot) {
      throw new Error("Busy time slot not found");
    }

    return busyTimeSlot;
  } catch (error) {
    throw new Error("Error unmarking time slot as busy: " + error.message);
  }
}

/**
 * Check if a time slot is busy
 * @param {Date} date - The date to check
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @returns {Promise<boolean>} - True if the time slot is busy
 */
async function isTimeSlotBusy(date, startTime, endTime) {
  try {
    return await busyTimeSlotDataModule.isTimeSlotBusy(
      date,
      startTime,
      endTime
    );
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
    return await busyTimeSlotDataModule.getBusyTimeSlotsForDate(date);
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
    return await busyTimeSlotDataModule.getAllBusyTimeSlots(startDate, endDate);
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
