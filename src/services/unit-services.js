const unitDataModule = require("../database/unit-data");

/**
 * Get all units with optional filtering
 * @param {object} options - Query options
 * @returns {Promise<Array>} - Array of units
 */
async function getAllUnits(options = {}) {
  try {
    const units = await unitDataModule.findAllUnits(options);
    return units;
  } catch (error) {
    throw new Error("Error getting all units: " + error.message);
  }
}

/**
 * Get unit by ID
 * @param {number} id - Unit ID
 * @returns {Promise<object>} - Unit object
 */
async function getUnitById(id) {
  try {
    if (!id) {
      throw new Error("Unit ID is required");
    }

    const unit = await unitDataModule.findUnitById(id);
    if (!unit) {
      throw new Error("Unit not found");
    }

    return unit;
  } catch (error) {
    throw new Error("Error getting unit by id: " + error.message);
  }
}

/**
 * Create a new unit
 * @param {object} unitData - Unit data
 * @returns {Promise<object>} - Created unit
 */
async function createUnit(unitData) {
  try {
    // Validate required fields
    if (!unitData.name || !unitData.name.trim()) {
      throw new Error("Unit name is required");
    }

    // Check if unit with same name already exists
    const existingUnit = await unitDataModule.findUnitByName(
      unitData.name.trim()
    );
    if (existingUnit) {
      throw new Error("Unit with this name already exists");
    }

    // Create unit
    const newUnit = await unitDataModule.createUnit({
      name: unitData.name.trim(),
      description: unitData.description?.trim() || null,
      isActive: unitData.isActive !== undefined ? unitData.isActive : true,
    });

    return newUnit;
  } catch (error) {
    throw new Error("Error creating unit: " + error.message);
  }
}

/**
 * Update unit
 * @param {number} id - Unit ID
 * @param {object} unitData - Unit data to update
 * @returns {Promise<object>} - Updated unit
 */
async function updateUnit(id, unitData) {
  try {
    if (!id) {
      throw new Error("Unit ID is required");
    }

    // Check if unit exists
    const existingUnit = await unitDataModule.findUnitById(id);
    if (!existingUnit) {
      throw new Error("Unit not found");
    }

    // If name is being updated, check for duplicates
    if (unitData.name && unitData.name.trim() !== existingUnit.name) {
      const duplicateUnit = await unitDataModule.findUnitByName(
        unitData.name.trim()
      );
      if (duplicateUnit) {
        throw new Error("Unit with this name already exists");
      }
    }

    // Update unit
    const updatedUnit = await unitDataModule.updateUnit(id, {
      name: unitData.name?.trim() || existingUnit.name,
      description: unitData.description?.trim() || existingUnit.description,
      isActive:
        unitData.isActive !== undefined
          ? unitData.isActive
          : existingUnit.isActive,
    });

    return updatedUnit;
  } catch (error) {
    throw new Error("Error updating unit: " + error.message);
  }
}

/**
 * Delete unit (soft delete)
 * @param {number} id - Unit ID
 * @returns {Promise<object>} - Deleted unit
 */
async function deleteUnit(id) {
  try {
    if (!id) {
      throw new Error("Unit ID is required");
    }

    const deletedUnit = await unitDataModule.deleteUnit(id);
    return deletedUnit;
  } catch (error) {
    throw new Error("Error deleting unit: " + error.message);
  }
}

/**
 * Permanently delete unit (hard delete)
 * @param {number} id - Unit ID
 * @returns {Promise<object>} - Deleted unit
 */
async function hardDeleteUnit(id) {
  try {
    if (!id) {
      throw new Error("Unit ID is required");
    }

    // Check if unit exists first
    const existingUnit = await unitDataModule.findUnitById(id);
    if (!existingUnit) {
      throw new Error("Unit not found");
    }

    // Check if unit has associated users or appointments
    if (
      existingUnit._count &&
      (existingUnit._count.users > 0 || existingUnit._count.appointments > 0)
    ) {
      throw new Error(
        "Cannot permanently delete unit with associated users or appointments. Please remove them first."
      );
    }

    const deletedUnit = await unitDataModule.hardDeleteUnit(id);
    return deletedUnit;
  } catch (error) {
    throw new Error("Error permanently deleting unit: " + error.message);
  }
}

module.exports = {
  getAllUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  hardDeleteUnit,
};
