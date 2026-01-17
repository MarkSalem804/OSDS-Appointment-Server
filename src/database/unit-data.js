const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

//Get all units
async function findAllUnits(options = {}) {
  try {
    const where = {};
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const units = await prisma.unit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            users: true,
            appointments: true,
          },
        },
      },
    });
    return units;
  } catch (error) {
    throw new Error("Error finding all units: " + error.message);
  }
}

//Get unit by ID
async function findUnitById(id) {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            appointments: true,
          },
        },
      },
    });
    return unit;
  } catch (error) {
    throw new Error("Error finding unit by id: " + error.message);
  }
}

//Get unit by name
async function findUnitByName(name) {
  try {
    const unit = await prisma.unit.findFirst({
      where: { name },
    });
    return unit;
  } catch (error) {
    throw new Error("Error finding unit by name: " + error.message);
  }
}

//Create a new unit
async function createUnit(unitData) {
  try {
    const unit = await prisma.unit.create({
      data: {
        name: unitData.name,
        description: unitData.description,
        isActive: unitData.isActive !== undefined ? unitData.isActive : true,
      },
    });
    return unit;
  } catch (error) {
    throw new Error("Error creating unit: " + error.message);
  }
}

//Update unit
async function updateUnit(id, unitData) {
  try {
    const unit = await prisma.unit.update({
      where: { id },
      data: {
        name: unitData.name,
        description: unitData.description,
        isActive: unitData.isActive,
      },
    });
    return unit;
  } catch (error) {
    throw new Error("Error updating unit: " + error.message);
  }
}

//Delete unit (soft delete by setting isActive to false)
async function deleteUnit(id) {
  try {
    // Check if unit has associated users or appointments
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            appointments: true,
          },
        },
      },
    });

    if (!unit) {
      throw new Error("Unit not found");
    }

    // Soft delete by setting isActive to false
    const deletedUnit = await prisma.unit.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return deletedUnit;
  } catch (error) {
    throw new Error("Error deleting unit: " + error.message);
  }
}

//Hard delete unit (permanent deletion)
async function hardDeleteUnit(id) {
  try {
    const unit = await prisma.unit.delete({
      where: { id },
    });
    return unit;
  } catch (error) {
    throw new Error("Error hard deleting unit: " + error.message);
  }
}

module.exports = {
  findAllUnits,
  findUnitById,
  findUnitByName,
  createUnit,
  updateUnit,
  deleteUnit,
  hardDeleteUnit,
};
