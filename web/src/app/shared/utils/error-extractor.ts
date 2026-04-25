/**
 * Extracts detailed error messages from HTTP error responses.
 * Handles both simple message errors and validation field errors.
 * 
 * Usage:
 *   const msg = extractErrorMessage(httpError, 'Default message');
 */
export function extractErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
  // Try to get main message first
  const message = error?.error?.message ?? error?.message ?? defaultMessage;
  
  // Check for field-level validation errors
  if (error?.error?.errors && typeof error.error.errors === 'object') {
    const fieldErrors = Object.entries(error.error.errors)
      .map(([field, messages]: [string, any]) => {
        const msgs = Array.isArray(messages) ? messages.join('; ') : messages;
        return `${field}: ${msgs}`;
      })
      .join(' | ');
    
    if (fieldErrors) {
      return `${message} — ${fieldErrors}`;
    }
  }
  
  return message;
}
