/**
 * Erro de aplicação com status HTTP. Lançado pelas camadas de serviço/controller
 * e tratado centralmente pelo middleware de erros.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  static notFound(resource = 'Recurso'): AppError {
    return new AppError(`${resource} não encontrado.`, 404);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, details);
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409);
  }
}
