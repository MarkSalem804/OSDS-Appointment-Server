const express = require("express");
const busyTimeSlotServices = require("../services/busy-time-slot-services");
const { requireAuth } = require("../middlewares/auth");

const busyTimeSlotRouter = express.Router();

/**
 * POST /markBusyTimeSlot
 * Mark a time slot as busy
 */
busyTimeSlotRouter.post("/markBusyTimeSlot", requireAuth, async (req, res) => {
  try {
    const { date, startTime, endTime, reason } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: "Date, startTime, and endTime are required",
      });
    }

    // Parse dates - ensure local date interpretation to avoid timezone issues
    // If date is a string in YYYY-MM-DD format, parse it as local date
    let dateObj;
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Parse as local date (YYYY-MM-DD)
      const [year, month, day] = date.split("-").map(Number);
      dateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      dateObj = new Date(date);
    }

    const startTimeObj = new Date(startTime);
    const endTimeObj = new Date(endTime);

    if (
      isNaN(dateObj.getTime()) ||
      isNaN(startTimeObj.getTime()) ||
      isNaN(endTimeObj.getTime())
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid date or time format",
      });
    }

    const busyTimeSlot = await busyTimeSlotServices.markTimeSlotAsBusy(
      dateObj,
      startTimeObj,
      endTimeObj,
      reason || null
    );

    res.json({
      success: true,
      data: busyTimeSlot,
    });
  } catch (error) {
    console.error("Error marking time slot as busy:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to mark time slot as busy",
    });
  }
});

/**
 * DELETE /unmarkBusyTimeSlot/:id
 * Unmark a time slot as busy
 */
busyTimeSlotRouter.delete(
  "/unmarkBusyTimeSlot/:id",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: "Valid ID is required",
        });
      }

      const busyTimeSlot = await busyTimeSlotServices.unmarkTimeSlotAsBusy(
        parseInt(id)
      );

      res.json({
        success: true,
        data: busyTimeSlot,
      });
    } catch (error) {
      console.error("Error unmarking time slot as busy:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to unmark time slot as busy",
      });
    }
  }
);

/**
 * GET /isTimeSlotBusy
 * Check if a time slot is busy
 */
busyTimeSlotRouter.get("/isTimeSlotBusy", requireAuth, async (req, res) => {
  try {
    const { date, startTime, endTime } = req.query;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: "Date, startTime, and endTime are required",
      });
    }

    // Parse dates - ensure local date interpretation to avoid timezone issues
    // If date is a string in YYYY-MM-DD format, parse it as local date
    let dateObj;
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Parse as local date (YYYY-MM-DD)
      const [year, month, day] = date.split("-").map(Number);
      dateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      dateObj = new Date(date);
    }

    const startTimeObj = new Date(startTime);
    const endTimeObj = new Date(endTime);

    if (
      isNaN(dateObj.getTime()) ||
      isNaN(startTimeObj.getTime()) ||
      isNaN(endTimeObj.getTime())
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid date or time format",
      });
    }

    const isBusy = await busyTimeSlotServices.isTimeSlotBusy(
      dateObj,
      startTimeObj,
      endTimeObj
    );

    res.json({
      success: true,
      data: { isBusy },
    });
  } catch (error) {
    console.error("Error checking if time slot is busy:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to check if time slot is busy",
    });
  }
});

/**
 * GET /getBusyTimeSlotsForDate
 * Get all busy time slots for a date
 */
busyTimeSlotRouter.get(
  "/getBusyTimeSlotsForDate",
  requireAuth,
  async (req, res) => {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: "Date is required",
        });
      }

      // Parse date as local date (YYYY-MM-DD format)
      let dateObj;
      if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Parse as local date to avoid timezone issues
        const [year, month, day] = date.split("-").map(Number);
        dateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
      } else {
        dateObj = new Date(date);
      }

      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid date format",
        });
      }

      const busyTimeSlots = await busyTimeSlotServices.getBusyTimeSlotsForDate(
        dateObj
      );

      res.json({
        success: true,
        data: busyTimeSlots,
      });
    } catch (error) {
      console.error("Error getting busy time slots for date:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get busy time slots for date",
      });
    }
  }
);

/**
 * GET /getAllBusyTimeSlots
 * Get all busy time slots within a date range
 */
busyTimeSlotRouter.get(
  "/getAllBusyTimeSlots",
  requireAuth,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // Parse dates as local dates to avoid timezone issues
      let startDateObj = null;
      let endDateObj = null;

      if (startDate) {
        if (typeof startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
          const [year, month, day] = startDate.split("-").map(Number);
          startDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else {
          startDateObj = new Date(startDate);
        }
      }

      if (endDate) {
        if (typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          const [year, month, day] = endDate.split("-").map(Number);
          endDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else {
          endDateObj = new Date(endDate);
        }
      }

      if (startDate && isNaN(startDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid startDate format",
        });
      }

      if (endDate && isNaN(endDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Invalid endDate format",
        });
      }

      const busyTimeSlots = await busyTimeSlotServices.getAllBusyTimeSlots(
        startDateObj,
        endDateObj
      );

      res.json({
        success: true,
        data: busyTimeSlots,
      });
    } catch (error) {
      console.error("Error getting all busy time slots:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get all busy time slots",
      });
    }
  }
);

module.exports = busyTimeSlotRouter;
