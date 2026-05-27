/**
 * Extracts detailed error messages from HTTP error responses.
 * Handles both simple message errors and validation field errors.
 * 
 * Usage:
 *   const msg = extractErrorMessage(httpError, 'Default message');
 */
function normalizeErrorValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map(item => normalizeErrorValue(item))
      .filter((item): item is string => !!item);

    return parts.length > 0 ? parts.join('; ') : null;
  }

  if (value && typeof value === 'object') {
    const parts = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const normalized = normalizeErrorValue(item);
        return normalized ? `${key}: ${normalized}` : null;
      })
      .filter((item): item is string => !!item);

    return parts.length > 0 ? parts.join(' | ') : null;
  }

  return null;
}

export function extractErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
  // Try to get main message first
  const message =
    normalizeErrorValue(error?.error?.message)
    ?? normalizeErrorValue(error?.error?.error)
    ?? normalizeErrorValue(error?.error?.title)
    ?? normalizeErrorValue(error?.message)
    ?? defaultMessage;
  
  // Check for field-level validation errors
  if (error?.error?.errors && typeof error.error.errors === 'object') {
    const fieldErrors = Object.entries(error.error.errors)
      .map(([field, messages]: [string, any]) => {
        const msgs = normalizeErrorValue(messages);
        return msgs ? `${field}: ${msgs}` : null;
      })
      .filter((entry): entry is string => !!entry)
      .join(' | ');
    
    if (fieldErrors) {
      return `${message} — ${fieldErrors}`;
    }
  }
  
  return message;
}
