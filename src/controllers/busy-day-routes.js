const express = require("express");
const busyDayRouter = express.Router();
const busyDayServices = require("../services/busy-day-services");
const { requireAuth } = require("../middlewares/auth");

// Mark a day as busy
busyDayRouter.post("/markBusy", requireAuth, async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Date is required",
      });
    }

    // Parse date - handle both YYYY-MM-DD strings and ISO strings
    let parsedDate;
    if (typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // YYYY-MM-DD format - treat as local date
      const [year, month, day] = date.split("-").map(Number);
      parsedDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      parsedDate = new Date(date);
    }

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    const result = await busyDayServices.markDayAsBusy(parsedDate);

    console.log(
      `✅ [Busy Day] Marked ${
        parsedDate.toISOString().split("T")[0]
      } as busy. Moved ${result.totalMoved} appointments.`
    );

    res.status(200).json({
      success: true,
      message: "Day marked as busy successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ [Busy Day] Failed to mark day as busy:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to mark day as busy",
    });
  }
});

// Unmark a day as busy
busyDayRouter.post("/unmarkBusy", requireAuth, async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Date is required",
      });
    }

    // Parse date - handle both YYYY-MM-DD strings and ISO strings
    let parsedDate;
    if (typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // YYYY-MM-DD format - treat as local date
      const [year, month, day] = date.split("-").map(Number);
      parsedDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      parsedDate = new Date(date);
    }

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    const busyDay = await busyDayServices.unmarkDayAsBusy(parsedDate);

    console.log(
      `✅ [Busy Day] Unmarked ${
        parsedDate.toISOString().split("T")[0]
      } as busy.`
    );

    res.status(200).json({
      success: true,
      message: busyDay
        ? "Day unmarked as busy successfully"
        : "Day was not marked as busy",
      data: busyDay,
    });
  } catch (error) {
    console.error("❌ [Busy Day] Failed to unmark day as busy:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to unmark day as busy",
    });
  }
});

// Check if a day is busy
busyDayRouter.get("/isBusy", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Date is required",
      });
    }

    // Parse date - handle both YYYY-MM-DD strings and ISO strings
    let parsedDate;
    if (typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // YYYY-MM-DD format - treat as local date
      const [year, month, day] = date.split("-").map(Number);
      parsedDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      parsedDate = new Date(date);
    }

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    const isBusy = await busyDayServices.isDayBusy(parsedDate);

    res.status(200).json({
      success: true,
      message: "Day busy status retrieved successfully",
      data: { isBusy, date: parsedDate },
    });
  } catch (error) {
    console.error(
      "❌ [Busy Day] Failed to check if day is busy:",
      error.message
    );
    res.status(500).json({
      success: false,
      error: error.message || "Failed to check if day is busy",
    });
  }
});

// Get all busy days
busyDayRouter.get("/getAllBusyDays", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let parsedStartDate = null;
    let parsedEndDate = null;

    if (startDate) {
      if (
        typeof startDate === "string" &&
        startDate.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        const [year, month, day] = startDate.split("-").map(Number);
        parsedStartDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      } else {
        parsedStartDate = new Date(startDate);
      }
    }

    if (endDate) {
      if (typeof endDate === "string" && endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = endDate.split("-").map(Number);
        parsedEndDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      } else {
        parsedEndDate = new Date(endDate);
      }
    }

    const busyDays = await busyDayServices.getAllBusyDays(
      parsedStartDate,
      parsedEndDate
    );

    res.status(200).json({
      success: true,
      message: "Busy days retrieved successfully",
      data: busyDays,
      count: busyDays.length,
    });
  } catch (error) {
    console.error("❌ [Busy Day] Failed to get all busy days:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get all busy days",
    });
  }
});

module.exports = busyDayRouter;
