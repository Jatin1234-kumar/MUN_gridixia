import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import { createLogger, trackApiFailure } from '../utils/logger';

const log = createLogger('errorHandler');

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'app_error');
      scope.setTag('status_code', String(err.statusCode));
      scope.setExtra('url', req.originalUrl);
      scope.setExtra('method', req.method);
      scope.captureException(err);
    });

    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  log.errorWithException(err, {
    method: req.method,
    path: req.originalUrl,
    statusCode: 500,
  });

  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'unhandled');
    scope.setTag('status_code', '500');
    scope.setExtra('url', req.originalUrl);
    scope.setExtra('method', req.method);
    scope.setExtra('query', req.query);
    scope.captureException(err);
  });

  trackApiFailure({
    method: req.method,
    path: req.originalUrl,
    statusCode: 500,
    error: err.message,
    userId: (req as Request & { user?: { sub: string } }).user?.sub,
  });

  res.status(500).json({
    message: config.isDev ? err.message : 'Internal server error',
  });
}
