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


type ErrorValue = unknown;
type ErrorRecord = Record<string, ErrorValue>;

function isRecord(value: unknown): value is ErrorRecord {
  return typeof value === "object" && value !== null;
}

export function extractErrorMessage(
  error: unknown,
  defaultMessage = "An error occurred"
): string {
  const err = isRecord(error) ? error : {};

  const nestedError = isRecord(err["error"]) ? err["error"] : {};

  const message =
    normalizeErrorValue(nestedError["message"]) ??
    normalizeErrorValue(nestedError["error"]) ??
    normalizeErrorValue(nestedError["title"]) ??
    normalizeErrorValue(err["message"]) ??
    defaultMessage;

  // Field-level validation errors
  const rawErrors = isRecord(nestedError["errors"])
    ? nestedError["errors"]
    : null;

  if (rawErrors) {
    const fieldErrors = Object.entries(rawErrors)
      .map(([field, messages]) => {
        const msgs = normalizeErrorValue(messages);
        return msgs ? `${field}: ${msgs}` : null;
      })
      .filter((entry): entry is string => entry !== null)
      .join(" | ");

    if (fieldErrors) {
      return `${message} — ${fieldErrors}`;
    }
  }

  return message;
}


