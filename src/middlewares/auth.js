const jwt = require("jsonwebtoken");

/**
 * Optional authentication middleware
 * If a token is provided, it validates it and attaches user info to req.user
 * If no token is provided, the request continues (for unauthenticated endpoints)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function optionalAuth(req, res, next) {
  try {
    // Get token from httpOnly cookie (preferred) or Authorization header (fallback)
    let token = req.cookies?.token;

    // Fallback to Authorization header if cookie not available
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7); // Remove "Bearer " prefix
      }
    }

    if (!token) {
      // No token provided - request continues without authentication
      req.user = null;
      return next();
    }

    // Verify token
    const JWT_SECRET =
      process.env.JWT_SECRET || "your-secret-key-change-in-production";
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // If token is invalid, treat as unauthenticated (don't block the request)
    req.user = null;
    next();
  }
}

/**
 * Required authentication middleware
 * Requires a valid token, otherwise returns 401 Unauthorized
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function requireAuth(req, res, next) {
  try {
    // Get token from httpOnly cookie (preferred) or Authorization header (fallback)
    let token = req.cookies?.token;

    // Fallback to Authorization header if cookie not available
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7); // Remove "Bearer " prefix
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please login.",
      });
    }

    // Verify token
    const JWT_SECRET =
      process.env.JWT_SECRET || "your-secret-key-change-in-production";
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token has expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Authentication failed.",
    });
  }
}

/**
 * Generate JWT token for a user
 * @param {object} user - User object with id, email, and role
 * @returns {string} - JWT token
 */
function generateToken(user) {
  const JWT_SECRET =
    process.env.JWT_SECRET || "your-secret-key-change-in-production";
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // Default 7 days

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role || "user",
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

module.exports = {
  optionalAuth,
  requireAuth,
  generateToken,
};
