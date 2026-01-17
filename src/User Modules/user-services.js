const userDataModule = require("./user-data");
const unitDataModule = require("../database/unit-data");
const bcrypt = require("bcryptjs");
const sendEmail = require("../middlewares/sendEmail");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Check if temporary account is expired
 * @param {object} user - User object
 * @returns {boolean} - True if expired, false otherwise
 */
function isTemporaryAccountExpired(user) {
  if (!user.isTemporary || !user.temporaryAccountExpiresAt) {
    return false; // Not a temporary account or no expiration date
  }
  const now = new Date();
  const expiresAt = new Date(user.temporaryAccountExpiresAt);
  return now > expiresAt;
}

async function authenticateUser(email, password) {
  try {
    const user = await userDataModule.findUserByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if temporary account is expired
    if (isTemporaryAccountExpired(user)) {
      throw new Error(
        "Your temporary account has expired. Please request a new temporary account."
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    // Update last login
    await prisma.user.update({
      where: { email },
      data: { lastLogin: new Date() },
    });

    return user;
  } catch (error) {
    throw new Error("Error authenticating user: " + error.message);
  }
}

function generateTemporaryPassword() {
  // Generate a random 12-character password with letters and numbers
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Create temporary account and send credentials via email
 */
async function createTemporaryAccount(email) {
  try {
    // Check if user already exists
    const existingUser = await userDataModule.findUserByEmail(email);

    // Calculate expiration date (3 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 3);

    if (existingUser) {
      // If user exists, generate new temporary password and update
      const tempPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Update user with new temporary password and expiration
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          isTemporary: true,
          temporaryAccountExpiresAt: expirationDate,
        },
      });

      // Send email with new credentials
      await sendTemporaryCredentialsEmail(email, tempPassword, true);

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } else {
      // Create new user with temporary credentials
      const tempPassword = generateTemporaryPassword();

      const newUser = await userDataModule.createUser({
        email,
        password: tempPassword, // Will be hashed in createUser
        isTemporary: true,
        role: "user",
        temporaryAccountExpiresAt: expirationDate,
      });

      // Send email with credentials
      await sendTemporaryCredentialsEmail(email, tempPassword, false);

      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    }
  } catch (error) {
    throw new Error("Error creating temporary account: " + error.message);
  }
}

/**
 * Send temporary credentials email
 */
async function sendTemporaryCredentialsEmail(
  email,
  password,
  isUpdate = false
) {
  const subject = isUpdate
    ? "Your Temporary Account Credentials Have Been Updated"
    : "Your Temporary Account Credentials - OSDS Appointment System";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Poppins', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .credentials-box {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .credential-item {
          margin: 15px 0;
        }
        .label {
          font-weight: 600;
          color: #6b7280;
          font-size: 14px;
        }
        .value {
          font-size: 18px;
          color: #111827;
          font-weight: 600;
          font-family: monospace;
          background: #f3f4f6;
          padding: 8px 12px;
          border-radius: 4px;
          display: inline-block;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 12px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Office of the Schools Division Superintendent</h1>
        <p>Appointment System</p>
      </div>
      <div class="content">
        <h2>${
          isUpdate
            ? "Your Credentials Have Been Updated"
            : "Welcome! Your Temporary Account Has Been Created"
        }</h2>
        
        <p>Dear User,</p>
        
        <p>${
          isUpdate
            ? "Your temporary account credentials have been updated. Please use the new credentials below to access the system."
            : "Thank you for your interest in tracking your appointments. Your temporary account has been created successfully."
        }</p>

        <div class="credentials-box">
          <div class="credential-item">
            <div class="label">Email (Username):</div>
            <div class="value">${email}</div>
          </div>
          <div class="credential-item">
            <div class="label">Temporary Password:</div>
            <div class="value">${password}</div>
          </div>
        </div>

        <div class="warning">
          <strong>⚠️ Important Security Notice:</strong>
          <ul>
            <li>This is a temporary account that will expire in <strong>3 days</strong>.</li>
            <li>This is a temporary password. Please change it after your first login to convert your account to a full account.</li>
            <li>Once you change your password, your account will become a full account and will not expire.</li>
            <li>Do not share these credentials with anyone.</li>
            <li>If you did not request this account, please contact the administrator immediately.</li>
          </ul>
        </div>

        <p>You can now log in to the system using the credentials above.</p>

        <p>Best regards,<br>
        <strong>OSDS Appointment System</strong></p>
      </div>
      <div class="footer">
        <p>This is an automated email. Please do not reply to this message.</p>
        <p>&copy; ${new Date().getFullYear()} SDOIC - All rights reserved</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail(email, subject, html);
}

/**
 * Update user password and convert temporary account to full account
 * @param {number} userId - User ID
 * @param {string} currentPassword - Current password for verification
 * @param {string} newPassword - New password
 */
async function changePassword(
  userId,
  currentPassword,
  newPassword,
  isAdmin = false
) {
  try {
    const user = await userDataModule.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password (skip for admins)
    if (!isAdmin) {
      if (!currentPassword) {
        throw new Error("Current password is required");
      }
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        throw new Error("Current password is incorrect");
      }
    }

    // Update password (this will also convert temporary to full account)
    const updatedUser = await userDataModule.updateUserPassword(
      userId,
      newPassword
    );

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  } catch (error) {
    throw new Error("Error changing password: " + error.message);
  }
}

/**
 * Register a new user (for admins)
 * Auto-generates password and sends it via email
 * User must change password to become full account
 * @param {object} userData - User registration data
 * @returns {Promise<object>} - Created user (without password)
 */
async function registerUser(userData) {
  try {
    // Validate required fields
    if (!userData.email || !userData.email.trim()) {
      throw new Error("Email is required");
    }

    if (!userData.role || !userData.role.trim()) {
      throw new Error("Role is required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email.trim())) {
      throw new Error("Invalid email format");
    }

    // Check if email already exists
    const existingUser = await userDataModule.findUserByEmail(
      userData.email.trim()
    );
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Validate unitId if provided
    if (userData.unitId) {
      const unit = await unitDataModule.findUnitById(userData.unitId);
      if (!unit) {
        throw new Error("Unit not found");
      }
      if (!unit.isActive) {
        throw new Error("Cannot assign user to an inactive unit");
      }
    }

    // Validate role
    const validRoles = ["user", "admin"];
    if (!validRoles.includes(userData.role.toLowerCase())) {
      throw new Error("Invalid role. Must be 'user' or 'admin'");
    }

    // Auto-generate password
    const autoGeneratedPassword = generateTemporaryPassword();

    // Calculate expiration date (3 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 3);

    // Create user (temporary account - user must change password to become full)
    const newUser = await userDataModule.createUser({
      email: userData.email.trim(),
      password: autoGeneratedPassword, // Will be hashed in createUser
      fullName: userData.fullName?.trim() || null,
      contactNumber: userData.contactNumber?.trim() || null,
      positionTitle: userData.positionTitle?.trim() || null,
      unitId: userData.unitId || null,
      isTemporary: true, // Temporary account until password is changed
      role: userData.role.toLowerCase(),
      temporaryAccountExpiresAt: expirationDate,
    });

    // Send email with auto-generated password
    await sendRegistrationCredentialsEmail(
      newUser.email,
      autoGeneratedPassword,
      newUser.fullName || "User"
    );

    // Remove password from response
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  } catch (error) {
    throw new Error("Error registering user: " + error.message);
  }
}

/**
 * Send registration credentials email
 * @param {string} email - Recipient email
 * @param {string} password - Auto-generated password
 * @param {string} fullName - User's full name
 */
async function sendRegistrationCredentialsEmail(email, password, fullName) {
  const subject = "Your Account Has Been Created - OSDS Appointment System";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Poppins', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .credentials-box {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .credential-item {
          margin: 15px 0;
        }
        .label {
          font-weight: 600;
          color: #6b7280;
          font-size: 14px;
        }
        .value {
          font-size: 18px;
          color: #111827;
          font-weight: 600;
          font-family: monospace;
          background: #f3f4f6;
          padding: 8px 12px;
          border-radius: 4px;
          display: inline-block;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 12px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Office of the Schools Division Superintendent</h1>
        <p>Appointment System</p>
      </div>
      <div class="content">
        <h2>Welcome! Your Account Has Been Created</h2>
        
        <p>Dear ${fullName},</p>
        
        <p>An administrator has created an account for you in the OSDS Appointment System. Your account credentials are provided below.</p>

        <div class="credentials-box">
          <div class="credential-item">
            <div class="label">Email (Username):</div>
            <div class="value">${email}</div>
          </div>
          <div class="credential-item">
            <div class="label">Temporary Password:</div>
            <div class="value">${password}</div>
          </div>
        </div>

        <div class="warning">
          <strong>⚠️ Important Security Notice:</strong>
          <ul>
            <li>This is a temporary account that will expire in <strong>3 days</strong>.</li>
            <li>This is a temporary password. Please change it after your first login to convert your account to a full account.</li>
            <li>Once you change your password, your account will become a full account and will not expire.</li>
            <li>Do not share these credentials with anyone.</li>
            <li>If you did not expect this account, please contact the administrator immediately.</li>
          </ul>
        </div>

        <p>You can now log in to the system using the credentials above.</p>

        <p>Best regards,<br>
        <strong>OSDS Appointment System</strong></p>
      </div>
      <div class="footer">
        <p>This is an automated email. Please do not reply to this message.</p>
        <p>&copy; ${new Date().getFullYear()} SDOIC - All rights reserved</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail(email, subject, html);
}

/**
 * Update user information (for users and admins)
 * @param {number} userId - User ID
 * @param {object} userData - User data to update
 * @returns {Promise<object>} - Updated user (without password)
 */
async function updateUser(userId, userData) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Check if user exists
    const existingUser = await userDataModule.findUserById(userId);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // Validate unitId if provided
    if (userData.unitId !== undefined && userData.unitId !== null) {
      const unit = await unitDataModule.findUnitById(userData.unitId);
      if (!unit) {
        throw new Error("Unit not found");
      }
      if (!unit.isActive) {
        throw new Error("Cannot assign user to an inactive unit");
      }
    }

    // Validate role if provided
    if (userData.role !== undefined) {
      const validRoles = ["user", "admin"];
      if (!validRoles.includes(userData.role.toLowerCase())) {
        throw new Error("Invalid role. Must be 'user' or 'admin'");
      }
      userData.role = userData.role.toLowerCase();
    }

    // Update user
    const updatedUser = await userDataModule.updateUser(userId, userData);

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  } catch (error) {
    throw new Error("Error updating user: " + error.message);
  }
}

/**
 * Reset user password (for admins)
 * Auto-generates new password and sends it via email
 * @param {number} userId - User ID
 * @returns {Promise<object>} - Updated user (without password)
 */
async function resetPassword(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Check if user exists
    const existingUser = await userDataModule.findUserById(userId);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // Auto-generate new password
    const newPassword = generateTemporaryPassword();

    // Calculate expiration date (3 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 3);

    // Update password and set as temporary
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        isTemporary: true,
        temporaryAccountExpiresAt: expirationDate,
      },
    });

    // Send email with new password
    await sendPasswordResetEmail(
      updatedUser.email,
      newPassword,
      updatedUser.fullName || "User"
    );

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  } catch (error) {
    throw new Error("Error resetting password: " + error.message);
  }
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} password - New auto-generated password
 * @param {string} fullName - User's full name
 */
async function sendPasswordResetEmail(email, password, fullName) {
  const subject = "Your Password Has Been Reset - OSDS Appointment System";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Poppins', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .credentials-box {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .credential-item {
          margin: 15px 0;
        }
        .label {
          font-weight: 600;
          color: #6b7280;
          font-size: 14px;
        }
        .value {
          font-size: 18px;
          color: #111827;
          font-weight: 600;
          font-family: monospace;
          background: #f3f4f6;
          padding: 8px 12px;
          border-radius: 4px;
          display: inline-block;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 12px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Office of the Schools Division Superintendent</h1>
        <p>Appointment System</p>
      </div>
      <div class="content">
        <h2>Your Password Has Been Reset</h2>
        
        <p>Dear ${fullName},</p>
        
        <p>Your password has been reset by an administrator. Please use the new temporary password below to log in to your account.</p>

        <div class="credentials-box">
          <div class="credential-item">
            <div class="label">Email (Username):</div>
            <div class="value">${email}</div>
          </div>
          <div class="credential-item">
            <div class="label">New Temporary Password:</div>
            <div class="value">${password}</div>
          </div>
        </div>

        <div class="warning">
          <strong>⚠️ Important Security Notice:</strong>
          <ul>
            <li>This is a temporary password that will expire in <strong>3 days</strong>.</li>
            <li>Please change your password after logging in to convert your account to a full account.</li>
            <li>Once you change your password, your account will become a full account and will not expire.</li>
            <li>Do not share these credentials with anyone.</li>
            <li>If you did not request this password reset, please contact the administrator immediately.</li>
          </ul>
        </div>

        <p>You can now log in to the system using the new password above.</p>

        <p>Best regards,<br>
        <strong>OSDS Appointment System</strong></p>
      </div>
      <div class="footer">
        <p>This is an automated email. Please do not reply to this message.</p>
        <p>&copy; ${new Date().getFullYear()} SDOIC - All rights reserved</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail(email, subject, html);
}

/**
 * Get all users with optional filters (for admins)
 * @param {object} filters - Optional filters (role, isActive, search)
 * @returns {Promise<object>} - Object containing users array and count
 */
async function getAllUsers(filters = {}) {
  try {
    const users = await userDataModule.getAllUsers(filters);

    // Remove passwords from all users
    const usersWithoutPasswords = users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      users: usersWithoutPasswords,
      count: usersWithoutPasswords.length,
    };
  } catch (error) {
    throw new Error("Error getting all users: " + error.message);
  }
}

module.exports = {
  authenticateUser,
  createTemporaryAccount,
  changePassword,
  isTemporaryAccountExpired,
  registerUser,
  updateUser,
  resetPassword,
  getAllUsers,
};
