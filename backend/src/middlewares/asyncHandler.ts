import type { Request, Response, NextFunction, RequestHandler } from 'express';

/** Envolve handlers async para encaminhar rejeições ao errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
