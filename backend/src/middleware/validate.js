const { validationResult } = require('express-validator');

/**
 * Express-validator result handler middleware.
 * Place after validation chains to return 400 with error details.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array().map(e => ({
                field: e.path,
                message: e.msg,
                value: e.value,
            })),
        });
    }
    next();
};

module.exports = { validate };
