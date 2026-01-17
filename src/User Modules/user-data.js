const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function findUserByEmail(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user;
  } catch (error) {
    throw new Error("Error finding user by email: " + error.message);
  }
}

async function findUserById(id) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user;
  } catch (error) {
    throw new Error("Error finding user by id: " + error.message);
  }
}

async function createUser(userData) {
  try {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName,
        contactNumber: userData.contactNumber,
        positionTitle: userData.positionTitle,
        unitId: userData.unitId,
        isTemporary: userData.isTemporary,
        role: userData.role,
        temporaryAccountExpiresAt: userData.temporaryAccountExpiresAt,
      },
    });
    return user;
  } catch (error) {
    throw new Error("Error creating user: " + error.message);
  }
}

/**
 * Convert temporary account to full account (when password is changed)
 * @param {number} userId - User ID
 * @param {string} newPassword - New password (will be hashed)
 */
async function convertTemporaryToFullAccount(userId, newPassword) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        isTemporary: false,
        temporaryAccountExpiresAt: null, // Remove expiration
      },
    });
    return user;
  } catch (error) {
    throw new Error("Error converting temporary account: " + error.message);
  }
}

/**
 * Update user password
 * @param {number} userId - User ID
 * @param {string} newPassword - New password (will be hashed)
 */
async function updateUserPassword(userId, newPassword) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        // If account was temporary, convert it to full account
        isTemporary: false,
        temporaryAccountExpiresAt: null,
      },
    });
    return user;
  } catch (error) {
    throw new Error("Error updating password: " + error.message);
  }
}

/**
 * Update user information (excluding password)
 * @param {number} userId - User ID
 * @param {object} userData - User data to update
 * @returns {Promise<object>} - Updated user
 */
async function updateUser(userId, userData) {
  try {
    const updateData = {};

    if (userData.fullName !== undefined) {
      updateData.fullName = userData.fullName?.trim() || null;
    }
    if (userData.contactNumber !== undefined) {
      updateData.contactNumber = userData.contactNumber?.trim() || null;
    }
    if (userData.positionTitle !== undefined) {
      updateData.positionTitle = userData.positionTitle?.trim() || null;
    }
    if (userData.unitId !== undefined) {
      updateData.unitId = userData.unitId || null;
    }
    if (userData.role !== undefined) {
      updateData.role = userData.role;
    }
    if (userData.isActive !== undefined) {
      updateData.isActive = userData.isActive;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    return user;
  } catch (error) {
    throw new Error("Error updating user: " + error.message);
  }
}

/**
 * Get all users with optional filters
 * @param {object} filters - Optional filters (role, isActive, search)
 * @returns {Promise<Array>} - Array of users
 */
async function getAllUsers(filters = {}) {
  try {
    const where = {};

    // Filter by isActive (default to true if not specified)
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === true || filters.isActive === "true";
    } else {
      // Default to showing only active users
      where.isActive = true;
    }

    // Filter by role
    if (filters.role) {
      where.role = filters.role.toLowerCase();
    }

    // Search filter (search in email, fullName, positionTitle)
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { fullName: { contains: filters.search, mode: "insensitive" } },
        { positionTitle: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        unit: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return users;
  } catch (error) {
    throw new Error("Error getting all users: " + error.message);
  }
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  convertTemporaryToFullAccount,
  updateUserPassword,
  updateUser,
  getAllUsers,
};
