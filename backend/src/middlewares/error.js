import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const notFound = (req, res, next) => next(ApiError.notFound(`Route not found: ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.code === 'ER_DUP_ENTRY' ? 409 : 500);
    const message = error.code === 'ER_DUP_ENTRY' ? 'Duplicate entry' : error.message || 'Internal server error';
    error = new ApiError(statusCode, message);
  }
  if (error.statusCode >= 500) console.error(err);
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details ? { errors: error.details } : {}),
    ...(env.isProd ? {} : { stack: err.stack }),
  });
};
