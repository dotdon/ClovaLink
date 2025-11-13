import { NextResponse } from 'next/server';

/**
 * Standardized API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  meta?: ApiResponse['meta'],
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
      ...(meta && { meta }),
    },
    { status }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  status: number = 400,
  message?: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse<ApiResponse> {
  return errorResponse('Unauthorized', 401, message);
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message: string = 'Permission denied'): NextResponse<ApiResponse> {
  return errorResponse('Forbidden', 403, message);
}

/**
 * Create a not found response
 */
export function notFoundResponse(message: string = 'Resource not found'): NextResponse<ApiResponse> {
  return errorResponse('Not Found', 404, message);
}

/**
 * Create an internal server error response
 */
export function internalErrorResponse(
  message: string = 'Internal server error'
): NextResponse<ApiResponse> {
  return errorResponse('Internal Server Error', 500, message);
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
  errors: string[] | string,
  message?: string
): NextResponse<ApiResponse> {
  const errorMessages = Array.isArray(errors) ? errors : [errors];
  return NextResponse.json(
    {
      success: false,
      error: 'Validation Error',
      message: message || 'Invalid request data',
      data: {
        errors: errorMessages,
      },
    },
    { status: 400 }
  );
}

