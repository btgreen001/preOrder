using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace PreOrderApp.Infrastructure;

/// <summary>
/// Global exception handler middleware.
/// Catches all unhandled exceptions and returns consistent error responses.
/// Ensures validation errors and business logic errors are visible to the frontend.
/// </summary>
public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

    public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);

            // Handle non-success status codes from model validation, etc.
            if (!context.Response.IsSuccessStatusCode() && !context.Response.HasStarted)
            {
                // Read body if it hasn't been read yet
                if (context.Response.StatusCode >= 400)
                {
                    context.Response.ContentType = "application/json";

                    // Some responses already have a body (validation errors, etc.)
                    // Only wrap if body is empty or is the default validation error format
                    if (context.Response.Body.CanSeek && context.Response.Body.Length == 0)
                    {
                        var error = new ApiErrorResponse(GetStatusCodeMessage(context.Response.StatusCode));
                        var json = JsonSerializer.Serialize(error, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                        await context.Response.WriteAsync(json);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception in request");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        // If response has already started, we can't modify headers or status code
        if (context.Response.HasStarted)
        {
            return Task.CompletedTask;
        }

        context.Response.ContentType = "application/json";

        var response = new ApiErrorResponse(exception.Message);
        var statusCode = StatusCodes.Status500InternalServerError;

        // Map specific exception types to status codes and messages
        switch (exception)
        {
            case ArgumentNullException or ArgumentException:
                statusCode = StatusCodes.Status400BadRequest;
                break;

            case KeyNotFoundException:
                statusCode = StatusCodes.Status404NotFound;
                response.Message = "Resource not found.";
                break;

            case InvalidOperationException:
                statusCode = StatusCodes.Status409Conflict;
                break;

            case UnauthorizedAccessException:
                statusCode = StatusCodes.Status401Unauthorized;
                break;
        }

        context.Response.StatusCode = statusCode;
        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        return context.Response.WriteAsync(json);
    }

    private static string GetStatusCodeMessage(int statusCode) => statusCode switch
    {
        StatusCodes.Status400BadRequest => "Invalid request. Please check your input.",
        StatusCodes.Status401Unauthorized => "Unauthorized. Please log in.",
        StatusCodes.Status403Forbidden => "Forbidden. You do not have permission.",
        StatusCodes.Status404NotFound => "Resource not found.",
        StatusCodes.Status409Conflict => "Conflict. The request conflicts with current state.",
        StatusCodes.Status422UnprocessableEntity => "Unprocessable entity. Validation failed.",
        _ => "An error occurred processing your request."
    };
}

internal static class HttpResponseExtensions
{
    public static bool IsSuccessStatusCode(this HttpResponse response) => response.StatusCode >= 200 && response.StatusCode < 300;
}
