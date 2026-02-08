import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { userService } from '../services/userService.js';
import { config } from '../config.js';
import type { Role, User } from '../types.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'Missing auth token' });
  }
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    const user = await userService.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (user.status === 'ARCHIVED') {
      return res.status(403).json({ message: 'Account has been disabled' });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const allowed = user.roles.some((role) => roles.includes(role));
    if (!allowed) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
};
