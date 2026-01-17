const express = require("express");
const unitRouter = express.Router();
const unitServices = require("../services/unit-services");

//Get all units
unitRouter.get("/getAllUnits", async (req, res) => {
  try {
    const options = {};
    if (req.query.isActive !== undefined) {
      options.isActive = req.query.isActive === "true";
    }

    const units = await unitServices.getAllUnits(options);

    console.log(`✅ [Units] Retrieved ${units.length} units`);

    res.status(200).json({
      success: true,
      message: "Units retrieved successfully",
      data: units,
      count: units.length,
    });
  } catch (error) {
    console.error("❌ [Units] Failed to retrieve units:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve units",
    });
  }
});

//Get unit by ID
unitRouter.get("/getUnitById/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid unit ID",
      });
    }

    const unit = await unitServices.getUnitById(id);

    console.log(`✅ [Units] Retrieved unit ID: ${id}`);

    res.status(200).json({
      success: true,
      message: "Unit retrieved successfully",
      data: unit,
    });
  } catch (error) {
    console.error("❌ [Units] Failed to retrieve unit:", error.message);
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to retrieve unit",
    });
  }
});

//Create a new unit
unitRouter.post("/createUnit", async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Unit name is required",
      });
    }

    const unit = await unitServices.createUnit({
      name,
      description,
      isActive,
    });

    console.log(`✅ [Units] Created unit: ${unit.name} (ID: ${unit.id})`);

    res.status(201).json({
      success: true,
      message: "Unit created successfully",
      data: unit,
    });
  } catch (error) {
    console.error("❌ [Units] Failed to create unit:", error.message);
    const statusCode = error.message.includes("already exists") ? 409 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to create unit",
    });
  }
});

//Update Unit
unitRouter.put("/updateUnit/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid unit ID",
      });
    }

    const { name, description, isActive } = req.body;

    const unit = await unitServices.updateUnit(id, {
      name,
      description,
      isActive,
    });

    console.log(`✅ [Units] Updated unit ID: ${id}`);

    res.status(200).json({
      success: true,
      message: "Unit updated successfully",
      data: unit,
    });
  } catch (error) {
    console.error("❌ [Units] Failed to update unit:", error.message);
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("already exists")
      ? 409
      : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to update unit",
    });
  }
});

//Delete unit (soft delete)
unitRouter.delete("/deleteUnit/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid unit ID",
      });
    }

    const unit = await unitServices.deleteUnit(id);

    console.log(`✅ [Units] Deleted unit ID: ${id}`);

    res.status(200).json({
      success: true,
      message: "Unit deleted successfully",
      data: unit,
    });
  } catch (error) {
    console.error("❌ [Units] Failed to delete unit:", error.message);
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to delete unit",
    });
  }
});

//Permanently delete unit
unitRouter.delete("/deleteUnitPermanent/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid unit ID",
      });
    }

    const unit = await unitServices.hardDeleteUnit(id);

    console.log(`✅ [Units] Permanently deleted unit ID: ${id}`);

    res.status(200).json({
      success: true,
      message: "Unit permanently deleted successfully",
      data: unit,
    });
  } catch (error) {
    console.error(
      "❌ [Units] Failed to permanently delete unit:",
      error.message
    );
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("associated users or appointments")
      ? 400
      : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to permanently delete unit",
    });
  }
});

module.exports = unitRouter;
