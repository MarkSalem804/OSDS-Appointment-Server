const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Get all appointments with optional filtering
 * @param {object} options - Query options (date, status, isDeleted, etc.)
 * @returns {Promise<Array>} - Array of appointments
 */
async function findAllAppointments(options = {}) {
  try {
    const where = {
      isDeleted: options.isDeleted !== undefined ? options.isDeleted : false,
    };

    if (options.status) {
      where.appointmentStatus = options.status;
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.unitId) {
      where.unitId = options.unitId;
    }

    // Filter by date (if provided)
    if (options.date) {
      const startOfDay = new Date(options.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(options.date);
      endOfDay.setHours(23, 59, 59, 999);

      where.appointmentDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            contactNumber: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return appointments;
  } catch (error) {
    throw new Error("Error finding all appointments: " + error.message);
  }
}

/**
 * Get appointment by ID
 * @param {number} id - Appointment ID
 * @returns {Promise<object>} - Appointment object
 */
async function findAppointmentById(id) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            contactNumber: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return appointment;
  } catch (error) {
    throw new Error("Error finding appointment by id: " + error.message);
  }
}

/**
 * Find conflicting appointments on a specific date within a time range
 * @param {Date} appointmentDate - The date of the appointment
 * @param {Date} startTime - Start time of the appointment
 * @param {Date} endTime - End time of the appointment
 * @param {number} excludeAppointmentId - Optional: ID of appointment to exclude from conflict check (for updates)
 * @returns {Promise<Array>} - Array of conflicting appointments
 */
async function findConflictingAppointments(
  appointmentDate,
  startTime,
  endTime,
  excludeAppointmentId = null
) {
  try {
    // Normalize the date to start of day for comparison
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where = {
      appointmentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      isDeleted: false,
      // Only check for conflicts with approved appointments
      // Pending and rejected appointments can have duplicate time slots
      appointmentStatus: "approved",
      // Exclude the appointment being updated (if provided)
      ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
      // Check for time overlap: existing appointment starts before new appointment ends
      // AND existing appointment ends after new appointment starts
      AND: [
        {
          appointmentStartTime: {
            lt: endTime,
          },
        },
        {
          appointmentEndTime: {
            gt: startTime,
          },
        },
      ],
    };

    const conflictingAppointments = await prisma.appointment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return conflictingAppointments;
  } catch (error) {
    throw new Error("Error finding conflicting appointments: " + error.message);
  }
}

/**
 * Create a new appointment
 * @param {object} appointmentData - Appointment data
 * @returns {Promise<object>} - Created appointment
 */
async function createAppointment(appointmentData) {
  try {
    const appointment = await prisma.appointment.create({
      data: {
        userId: appointmentData.userId || null,
        unitId: appointmentData.unitId,
        fullName: appointmentData.fullName || null,
        agenda: appointmentData.agenda || null,
        appointmentDate: appointmentData.appointmentDate,
        appointmentStartTime: appointmentData.appointmentStartTime,
        appointmentEndTime: appointmentData.appointmentEndTime,
        appointmentStatus: appointmentData.appointmentStatus || "pending",
        createdBy: appointmentData.createdBy || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            contactNumber: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return appointment;
  } catch (error) {
    throw new Error("Error creating appointment: " + error.message);
  }
}

/**
 * Update appointment
 * @param {number} id - Appointment ID
 * @param {object} appointmentData - Appointment data to update
 * @returns {Promise<object>} - Updated appointment
 */
async function updateAppointment(id, appointmentData) {
  try {
    const updateData = {};

    if (appointmentData.appointmentDate !== undefined) {
      updateData.appointmentDate = appointmentData.appointmentDate;
    }
    if (appointmentData.appointmentStartTime !== undefined) {
      updateData.appointmentStartTime = appointmentData.appointmentStartTime;
    }
    if (appointmentData.appointmentEndTime !== undefined) {
      updateData.appointmentEndTime = appointmentData.appointmentEndTime;
    }
    if (appointmentData.appointmentStatus !== undefined) {
      updateData.appointmentStatus = appointmentData.appointmentStatus;
    }
    if (appointmentData.unitId !== undefined) {
      updateData.unitId = appointmentData.unitId;
    }
    if (appointmentData.userId !== undefined) {
      updateData.userId = appointmentData.userId || null;
    }
    if (appointmentData.fullName !== undefined) {
      updateData.fullName = appointmentData.fullName || null;
    }
    if (appointmentData.agenda !== undefined) {
      updateData.agenda = appointmentData.agenda || null;
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            contactNumber: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return appointment;
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
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        isDeleted: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return appointment;
  } catch (error) {
    throw new Error("Error deleting appointment: " + error.message);
  }
}

/**
 * Hard delete appointment (permanent deletion)
 * @param {number} id - Appointment ID
 * @returns {Promise<object>} - Deleted appointment
 */
async function hardDeleteAppointment(id) {
  try {
    const appointment = await prisma.appointment.delete({
      where: { id },
    });
    return appointment;
  } catch (error) {
    throw new Error("Error hard deleting appointment: " + error.message);
  }
}

module.exports = {
  findAllAppointments,
  findAppointmentById,
  findConflictingAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  hardDeleteAppointment,
};
