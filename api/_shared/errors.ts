import { HttpHeaders } from './cors';

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  statusCode: number;
  headers: HttpHeaders;
  body: string;
}

/**
 * Application error types for consistent error handling
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Custom application error class with standardized structure
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    this.name = 'AppError';
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorType.VALIDATION_ERROR, message, 400, true, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error for token/auth failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(ErrorType.AUTHENTICATION_ERROR, message, 401, true);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error for permission failures
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(ErrorType.AUTHORIZATION_ERROR, message, 403, true);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(ErrorType.NOT_FOUND_ERROR, `${resource} not found`, 404, true);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error for duplicate resources or business logic conflicts
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorType.CONFLICT_ERROR, message, 409, true, details);
    this.name = 'ConflictError';
  }
}

/**
 * Database error for database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(ErrorType.DATABASE_ERROR, message, 500, false, originalError);
    this.name = 'DatabaseError';
  }
}

/**
 * Maps error types to appropriate HTTP status codes
 */
const ERROR_STATUS_MAP: Record<ErrorType, number> = {
  [ErrorType.VALIDATION_ERROR]: 400,
  [ErrorType.AUTHENTICATION_ERROR]: 401,
  [ErrorType.AUTHORIZATION_ERROR]: 403,
  [ErrorType.NOT_FOUND_ERROR]: 404,
  [ErrorType.CONFLICT_ERROR]: 409,
  [ErrorType.RATE_LIMIT_ERROR]: 429,
  [ErrorType.DATABASE_ERROR]: 500,
  [ErrorType.EXTERNAL_SERVICE_ERROR]: 503,
  [ErrorType.INTERNAL_ERROR]: 500
};

/**
 * Sanitizes error messages to prevent information leakage in production
 * @param error - The error to sanitize
 * @param isDevelopment - Whether running in development mode
 * @returns Sanitized error message
 */
function sanitizeErrorMessage(error: Error, isDevelopment: boolean = false): string {
  // In development, show detailed error messages
  if (isDevelopment || process.env.NODE_ENV === 'development') {
    return error.message;
  }

  // In production, only show safe messages for AppErrors
  if (error instanceof AppError && error.isOperational) {
    return error.message;
  }

  // For unexpected errors in production, show generic message
  return 'An unexpected error occurred';
}

/**
 * Determines if error details should be included in the response
 * @param error - The error to check
 * @param isDevelopment - Whether running in development mode
 * @returns true if details should be included
 */
function shouldIncludeErrorDetails(error: Error, isDevelopment: boolean = false): boolean {
  return isDevelopment || (error instanceof AppError && error.isOperational);
}

/**
 * Creates a standardized error response object
 * @param error - The error to format
 * @param headers - HTTP headers to include
 * @param requestId - Optional request ID for tracking
 * @returns ErrorResponse object
 */
export function createErrorResponse(
  error: Error,
  headers: HttpHeaders,
  requestId?: string
): ErrorResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';

  let statusCode = 500;
  let errorType = ErrorType.INTERNAL_ERROR;

  // Determine status code and error type
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorType = error.type;
  } else {
    // Handle common error patterns
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      statusCode = 400;
      errorType = ErrorType.VALIDATION_ERROR;
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
      statusCode = 401;
      errorType = ErrorType.AUTHENTICATION_ERROR;
    } else if (errorMessage.includes('forbidden') || errorMessage.includes('permission')) {
      statusCode = 403;
      errorType = ErrorType.AUTHORIZATION_ERROR;
    } else if (errorMessage.includes('not found')) {
      statusCode = 404;
      errorType = ErrorType.NOT_FOUND_ERROR;
    } else if (errorMessage.includes('conflict') || errorMessage.includes('duplicate')) {
      statusCode = 409;
      errorType = ErrorType.CONFLICT_ERROR;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
      statusCode = 503;
      errorType = ErrorType.DATABASE_ERROR;
    }
  }

  // Build error response body
  const errorBody: any = {
    error: true,
    type: errorType,
    message: sanitizeErrorMessage(error, isDevelopment),
    statusCode,
    timestamp: new Date().toISOString()
  };

  // Add request ID if provided
  if (requestId) {
    errorBody.requestId = requestId;
  }

  // Add error details in development or for operational errors
  if (shouldIncludeErrorDetails(error, isDevelopment)) {
    if (error instanceof AppError && error.details) {
      errorBody.details = error.details;
    }

    // Add stack trace in development
    if (isDevelopment) {
      errorBody.stack = error.stack;
    }
  }

  // Log error for monitoring (but don't include sensitive info)
  console.error('❌ API Error:', {
    type: errorType,
    message: error.message,
    statusCode,
    requestId,
    stack: isDevelopment ? error.stack : undefined
  });

  return {
    statusCode,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(errorBody)
  };
}

/**
 * Wraps an async handler function with standardized error handling
 * @param handler - The async handler function to wrap
 * @param headers - Default headers to use for responses
 * @returns Wrapped handler function
 */
export function withErrorHandling(
  handler: (event: any, context: any) => Promise<any>,
  headers: HttpHeaders
) {
  return async (event: any, context: any) => {
    try {
      return await handler(event, context);
    } catch (error) {
      const requestId = context.awsRequestId || context.requestId;
      return createErrorResponse(error as Error, headers, requestId);
    }
  };
}

/**
 * Creates specific error response functions for common HTTP errors
 */
export const ErrorResponses = {
  badRequest: (message: string, headers: HttpHeaders, details?: any) =>
    createErrorResponse(new ValidationError(message, details), headers),

  unauthorized: (message: string, headers: HttpHeaders) =>
    createErrorResponse(new AuthenticationError(message), headers),

  forbidden: (message: string, headers: HttpHeaders) =>
    createErrorResponse(new AuthorizationError(message), headers),

  notFound: (resource: string, headers: HttpHeaders) =>
    createErrorResponse(new NotFoundError(resource), headers),

  conflict: (message: string, headers: HttpHeaders, details?: any) =>
    createErrorResponse(new ConflictError(message, details), headers),

  internalError: (message: string, headers: HttpHeaders, originalError?: Error) =>
    createErrorResponse(new DatabaseError(message, originalError), headers)
};

/**
 * Validates required fields in request body
 * @param body - Request body object
 * @param requiredFields - Array of required field names
 * @throws ValidationError if any required fields are missing
 */
export function validateRequiredFields(body: any, requiredFields: string[]): void {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing, providedFields: Object.keys(body) }
    );
  }
}

/**
 * Validates that a value is a positive number
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if value is not a positive number
 */
export function validatePositiveNumber(value: any, fieldName: string): void {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`);
  }
}

/**
 * Validates that a string meets minimum/maximum length requirements
 * @param value - String to validate
 * @param fieldName - Name of the field for error messages
 * @param minLength - Minimum required length
 * @param maxLength - Maximum allowed length
 * @throws ValidationError if string doesn't meet requirements
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = 255
): void {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  if (value.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters long`);
  }

  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName} must be no more than ${maxLength} characters long`);
  }
}