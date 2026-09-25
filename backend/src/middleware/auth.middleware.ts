import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // In development mode, allow seamless access as default admin
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        userId: 'admin-default-id',
        email: 'admin@leadengage.ai',
        role: 'ADMIN',
      };
      return next();
    }
    return sendError(res, 'UNAUTHORIZED', 'Authentication token missing', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as AuthenticatedUser;
    req.user = decoded;
    return next();
  } catch (err) {
    return sendError(res, 'UNAUTHORIZED', 'Invalid or expired token', 401);
  }
};

