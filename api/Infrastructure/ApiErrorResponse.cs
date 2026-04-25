namespace PreOrderApp.Infrastructure;

/// <summary>
/// Standard API error response structure.
/// All errors (validation, business logic, system) use this format.
/// </summary>
public class ApiErrorResponse
{
    public string Message { get; set; } = string.Empty;
    public Dictionary<string, string[]>? Errors { get; set; } // Field-level validation errors
    public string? TraceId { get; set; } // For debugging

    public ApiErrorResponse(string message)
    {
        Message = message;
    }

    public ApiErrorResponse(string message, Dictionary<string, string[]> errors) : this(message)
    {
        Errors = errors;
    }

    public ApiErrorResponse(string message, Dictionary<string, string[]> errors, string? traceId) : this(message, errors)
    {
        TraceId = traceId;
    }
}
