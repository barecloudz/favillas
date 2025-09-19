import { NetlifyEvent } from './auth';

/**
 * HTTP Headers interface for consistent typing
 */
export interface HttpHeaders {
  [key: string]: string;
}

/**
 * CORS configuration options
 */
export interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}

/**
 * Default CORS configuration for the Pizza Spin Rewards application
 */
const DEFAULT_CORS_CONFIG: Required<CorsOptions> = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://pizzaspinrewards.netlify.app',
    'https://pizza-spin-rewards.netlify.app',
    'https://pizzaspin.netlify.app'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  allowCredentials: true,
  maxAge: 86400 // 24 hours
};

/**
 * Determines the appropriate origin for CORS headers
 * @param event - Netlify Functions event object
 * @param corsOptions - CORS configuration options
 * @returns Allowed origin string
 */
function getAllowedOrigin(event: NetlifyEvent, corsOptions: Required<CorsOptions>): string {
  const requestOrigin = event.headers.origin;

  // If no origin header (like server-to-server requests), allow all
  if (!requestOrigin) {
    return '*';
  }

  // Check if the request origin is in our allowed list
  if (corsOptions.allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // For development, allow localhost with any port
  if (requestOrigin.startsWith('http://localhost:') || requestOrigin.startsWith('https://localhost:')) {
    return requestOrigin;
  }

  // Default to first allowed origin if not matched
  return corsOptions.allowedOrigins[0] || '*';
}

/**
 * Creates standardized CORS headers for API responses
 * @param event - Netlify Functions event object
 * @param corsOptions - Optional CORS configuration to override defaults
 * @returns HttpHeaders object with CORS headers
 */
export function createCorsHeaders(event: NetlifyEvent, corsOptions?: Partial<CorsOptions>): HttpHeaders {
  const config = { ...DEFAULT_CORS_CONFIG, ...corsOptions };
  const allowedOrigin = getAllowedOrigin(event, config);

  const headers: HttpHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': config.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': config.allowedHeaders.join(', '),
    'Access-Control-Max-Age': config.maxAge.toString(),
    'Content-Type': 'application/json'
  };

  // Only add credentials header if allowing credentials and not using wildcard origin
  if (config.allowCredentials && allowedOrigin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Creates headers specifically for API endpoints (includes common security headers)
 * @param event - Netlify Functions event object
 * @param corsOptions - Optional CORS configuration to override defaults
 * @returns HttpHeaders object with CORS and security headers
 */
export function createApiHeaders(event: NetlifyEvent, corsOptions?: Partial<CorsOptions>): HttpHeaders {
  const corsHeaders = createCorsHeaders(event, corsOptions);

  return {
    ...corsHeaders,
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Cache control for API responses
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

/**
 * Handles OPTIONS preflight requests with appropriate CORS headers
 * @param event - Netlify Functions event object
 * @param corsOptions - Optional CORS configuration to override defaults
 * @returns Standard OPTIONS response object
 */
export function handleOptionsRequest(event: NetlifyEvent, corsOptions?: Partial<CorsOptions>) {
  return {
    statusCode: 200,
    headers: createCorsHeaders(event, corsOptions),
    body: ''
  };
}

/**
 * Checks if the request method is allowed
 * @param method - HTTP method from the request
 * @param allowedMethods - Array of allowed HTTP methods
 * @returns true if method is allowed, false otherwise
 */
export function isMethodAllowed(method: string, allowedMethods?: string[]): boolean {
  const allowed = allowedMethods || DEFAULT_CORS_CONFIG.allowedMethods;
  return allowed.includes(method.toUpperCase());
}

/**
 * Creates a standardized error response for method not allowed
 * @param event - Netlify Functions event object
 * @param allowedMethods - Array of allowed HTTP methods for this endpoint
 * @returns 405 Method Not Allowed response object
 */
export function createMethodNotAllowedResponse(event: NetlifyEvent, allowedMethods?: string[]) {
  const headers = createApiHeaders(event);

  if (allowedMethods) {
    headers['Allow'] = allowedMethods.join(', ');
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({
      error: 'Method Not Allowed',
      message: `HTTP method ${event.httpMethod} is not allowed for this endpoint`,
      allowedMethods: allowedMethods || DEFAULT_CORS_CONFIG.allowedMethods
    })
  };
}

/**
 * Utility function to quickly set up CORS for an API endpoint
 * @param event - Netlify Functions event object
 * @param allowedMethods - Array of HTTP methods allowed for this endpoint
 * @param corsOptions - Optional CORS configuration
 * @returns Object with headers and a check for OPTIONS/method validation
 */
export function setupCors(
  event: NetlifyEvent,
  allowedMethods: string[] = ['GET', 'POST', 'OPTIONS'],
  corsOptions?: Partial<CorsOptions>
) {
  const headers = createApiHeaders(event, corsOptions);

  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      shouldReturn: true,
      response: {
        statusCode: 200,
        headers,
        body: ''
      }
    };
  }

  // Check if method is allowed
  if (!isMethodAllowed(event.httpMethod, allowedMethods)) {
    return {
      shouldReturn: true,
      response: createMethodNotAllowedResponse(event, allowedMethods)
    };
  }

  return {
    shouldReturn: false,
    headers
  };
}