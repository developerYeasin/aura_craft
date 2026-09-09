import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { queryOne } from '../config/db.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Authentication token missing');

    const payload = jwt.verify(token, env.jwt.secret);
    const user = await queryOne(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1',
      [payload.sub]
    );
    if (!user || !user.is_active) throw ApiError.unauthorized('Account is not active');
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Invalid or expired token'));
    }
    next(error);
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (roles.length && !roles.includes(req.user.role)) return next(ApiError.forbidden('Insufficient permissions'));
  next();
};
