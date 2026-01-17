const express = require("express");
const userRouter = express.Router();
const userServices = require("./user-services");
const { generateToken, requireAuth } = require("../middlewares/auth");

userRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await userServices.authenticateUser(email, password);

    console.log("✅ [Login] User authenticated successfully:", user.email);

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role || "user",
    });

    // Remove password from user object before sending
    const { password: _, ...userWithoutPassword } = user;

    // Set httpOnly cookie with token
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isProduction, // Only send over HTTPS in production
      sameSite: "strict", // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches JWT_EXPIRES_IN)
      path: "/", // Available site-wide
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userWithoutPassword,
      // Token is now in httpOnly cookie, not in response body
    });
  } catch (error) {
    console.error("❌ [Login] Authentication failed:", error.message);
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
});

userRouter.post("/request-temporary-account", async (req, res) => {
  const { email } = req.body;

  // Validate email
  if (!email || !email.trim()) {
    return res.status(400).json({
      success: false,
      error: "Email is required",
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Invalid email format",
    });
  }

  try {
    const user = await userServices.createTemporaryAccount(email);

    console.log(
      `✅ [Temporary Account] ${
        user.id ? "Created" : "Updated"
      } temporary account for: ${email}`
    );

    res.status(200).json({
      success: true,
      message:
        "Temporary account credentials have been sent to your email address",
      user: {
        id: user.id,
        email: user.email,
        isTemporary: user.isTemporary,
      },
    });
  } catch (error) {
    console.error(
      "❌ [Temporary Account] Failed to create/update account:",
      error.message
    );
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process your request",
    });
  }
});

userRouter.post("/change-password", requireAuth, async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  const authenticatedUser = req.user; // Get authenticated user from middleware
  const isAdmin = authenticatedUser?.role === "admin";

  // Validate input
  if (!userId || !newPassword) {
    return res.status(400).json({
      success: false,
      error: "UserId and new password are required",
    });
  }

  // For non-admin users, current password is required
  if (!isAdmin && !currentPassword) {
    return res.status(400).json({
      success: false,
      error: "Current password is required",
    });
  }

  // Validate new password length
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: "New password must be at least 6 characters long",
    });
  }

  try {
    // For admins, pass null/empty for currentPassword to skip verification
    const user = await userServices.changePassword(
      userId,
      isAdmin ? null : currentPassword, // Admins don't need current password
      newPassword,
      isAdmin // Pass admin flag
    );

    console.log(
      `✅ [Change Password] Password changed successfully for user ID: ${userId}`
    );

    res.status(200).json({
      success: true,
      message:
        user.isTemporary === false
          ? "Password changed successfully. Your account has been converted to a full account."
          : "Password changed successfully",
      user: {
        id: user.id,
        email: user.email,
        isTemporary: user.isTemporary,
      },
    });
  } catch (error) {
    console.error("❌ [Change Password] Failed:", error.message);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to change password",
    });
  }
});

//Register new user (for admins)
userRouter.post("/register", async (req, res) => {
  const { email, fullName, contactNumber, positionTitle, unitId, role } =
    req.body;

  try {
    const user = await userServices.registerUser({
      email,
      fullName,
      contactNumber,
      positionTitle,
      unitId,
      role,
    });

    console.log(`✅ [Register] User registered successfully: ${user.email}`);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: user,
    });
  } catch (error) {
    console.error("❌ [Register] Registration failed:", error.message);

    // Determine status code based on error type
    let statusCode = 500;
    if (
      error.message.includes("required") ||
      error.message.includes("Invalid") ||
      error.message.includes("must be")
    ) {
      statusCode = 400;
    } else if (error.message.includes("already exists")) {
      statusCode = 409;
    } else if (error.message.includes("not found")) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to register user",
    });
  }
});

//Update user (for users and admins)
userRouter.put("/updateUser/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    const { fullName, contactNumber, positionTitle, unitId, role, isActive } =
      req.body;

    // Prevent password updates through this endpoint
    if (req.body.password) {
      return res.status(400).json({
        success: false,
        error:
          "Password cannot be updated through this endpoint. Use change-password or reset-password instead.",
      });
    }

    const user = await userServices.updateUser(userId, {
      fullName,
      contactNumber,
      positionTitle,
      unitId,
      role,
      isActive,
    });

    console.log(`✅ [Update User] User updated successfully: ID ${userId}`);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: user,
    });
  } catch (error) {
    console.error("❌ [Update User] Update failed:", error.message);

    // Determine status code based on error type
    let statusCode = 500;
    if (
      error.message.includes("required") ||
      error.message.includes("Invalid")
    ) {
      statusCode = 400;
    } else if (error.message.includes("not found")) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to update user",
    });
  }
});

//Reset password (for admins)
userRouter.post("/reset-password/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    const user = await userServices.resetPassword(userId);

    console.log(
      `✅ [Reset Password] Password reset successfully for user ID: ${userId}`
    );

    res.status(200).json({
      success: true,
      message: "Password has been reset and sent to user's email",
      user: {
        id: user.id,
        email: user.email,
        isTemporary: user.isTemporary,
      },
    });
  } catch (error) {
    console.error("❌ [Reset Password] Reset failed:", error.message);

    // Determine status code based on error type
    let statusCode = 500;
    if (error.message.includes("required")) {
      statusCode = 400;
    } else if (error.message.includes("not found")) {
      statusCode = 404;
    }

    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to reset password",
    });
  }
});

// Get all users (for admins)
userRouter.get("/getAllUsers", async (req, res) => {
  try {
    const filters = {
      role: req.query.role,
      isDeleted: req.query.isDeleted,
      search: req.query.search,
    };

    const result = await userServices.getAllUsers(filters);

    console.log(`✅ [Get All Users] Retrieved ${result.count} users`);

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: result.users,
      count: result.count,
    });
  } catch (error) {
    console.error("❌ [Get All Users] Failed:", error.message);

    let statusCode = 500;
    if (error.message.includes("required")) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to get users",
    });
  }
});

// Logout endpoint - clears the httpOnly cookie
userRouter.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  console.log("✅ [Logout] User logged out successfully");

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

module.exports = userRouter;
