const allowedOrigins = require("./allowed-origins");

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // In development or if no NODE_ENV set, allow localhost with any port
      const isDevelopment =
        !process.env.NODE_ENV || process.env.NODE_ENV === "development";
      if (isDevelopment && origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow credentials
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
