import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
  };
  account?: {
    id: string;
    tenantId: string;
  };
}

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;

  console.error({
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.statusCode).json({
    success: false,
    error: {
      message: err.message,
      statusCode: err.statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      tenantId: decoded.tenantId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    throw new AppError('Invalid token', 401);
  }
};

export const accountIsolationMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const accountId = req.params.accountId || req.body.accountId;

    if (!accountId) {
      throw new AppError('Account ID required', 400);
    }

    req.account = {
      id: accountId,
      tenantId: req.user?.tenantId || '',
    };

    next();
  } catch (error) {
    throw new AppError('Invalid account', 403);
  }
};
