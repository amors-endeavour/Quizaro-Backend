// =====================================================
// USER VALIDATION SCHEMAS (Joi)
// Handles validation for register and login
// =====================================================

import Joi from "joi";

// ======================
// REGISTER SCHEMA
// ======================
const registerSchema = Joi.object({

  // User name (min 2 characters)
  name: Joi.string().min(2).required(),

  // Valid email format
  email: Joi.string().email().required(),

  // Password (minimum 6 characters)
  password: Joi.string().min(6).required(),

  // Role (optional: student/admin)
  role: Joi.string().valid("student", "admin").optional()
});

// ======================
// LOGIN SCHEMA
// ======================
const loginSchema = Joi.object({

  // Email required for login
  email: Joi.string().email().required(),

  // Password required for login
  password: Joi.string().required()
});

// =====================================================
// EXPORT SCHEMAS
// =====================================================
export { registerSchema, loginSchema };