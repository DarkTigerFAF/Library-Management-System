const { body, param, query, validationResult } = require('express-validator');

// Common handler to surface validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Helper to normalize ISBN by removing hyphens and spaces
const normalizeISBN = (value) => String(value).replace(/[-\s]/g, '');

// Book validators
const createBookValidator = [
  body('title').isString().trim().notEmpty(),
  body('author').isString().trim().notEmpty(),
  body('isbn')
    .isString()
    .trim()
    .customSanitizer(normalizeISBN)
    .matches(/^(?:\d{9}[\dXx]|\d{13})$/),
  body('available_quantity').isInt({ min: 0 }),
  body('shelf_location').optional().isString().trim(),
  handleValidationErrors,
];

const updateBookValidator = [
  param('id').isInt({ min: 1 }),
  body('title').optional().isString().trim().notEmpty(),
  body('author').optional().isString().trim().notEmpty(),
  body('isbn')
    .optional()
    .isString()
    .trim()
    .customSanitizer(normalizeISBN)
    .matches(/^(?:\d{9}[\dXx]|\d{13})$/),
  body('available_quantity').optional().isInt({ min: 0 }),
  body('shelf_location').optional().isString().trim(),
  handleValidationErrors,
];

const idParamValidator = [
  param('id').isInt({ min: 1 }), 
  handleValidationErrors
];

const listSearchValidator = [
  query('q').optional().isString().trim(),
  query('author').optional().isString().trim(),
  query('title').optional().isString().trim(),
  query('isbn')
    .optional()
    .customSanitizer(normalizeISBN)
    .matches(/^(?:\d{9}[\dXx]|\d{13})$/),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  handleValidationErrors,
];

// Borrowing validators (loans)
const checkoutValidator = [
  body('book_id').isInt({ min: 1 }),
  body('user_id').optional().isInt({ min: 1 }),
  body('due_date').isISO8601(),
  handleValidationErrors,
];

module.exports = {
  createBookValidator,
  updateBookValidator,
  idParamValidator,
  listSearchValidator,
  checkoutValidator,
};
