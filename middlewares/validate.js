// =====================================================
// VALIDATION MIDDLEWARE (Joi Schema Validation)
// =====================================================

// This middleware takes a Joi schema
// and returns a function to validate request data
const validate = (schema) => (req, res, next) => {

  // Ensure req.body exists (prevents undefined errors)
  const data = req.body || {};   // 🔥 FIX

  // Validate request data against provided schema
  const { error } = schema.validate(data);

  // If validation fails → send error response
  if (error) {
    return res.status(400).json({
      message: error.details[0].message
    });
  }

  // If validation passes → move to next middleware/controller
  next();
};

// =====================================================
// EXPORT MIDDLEWARE
// =====================================================
module.exports = validate;