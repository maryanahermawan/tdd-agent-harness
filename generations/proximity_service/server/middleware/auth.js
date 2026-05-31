/**
 * JWT Authentication Middleware
 * Validates JWT tokens for protected routes
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

/**
 * Middleware to verify JWT token
 * Attaches user info to req.user if valid
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // Attach user info (userId, username) to request
    next();
  });
};

/**
 * Generate JWT token for user
 */
export const generateToken = (userId, username) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn }
  );
};
