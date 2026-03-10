namespace AutoVeo.Shared.Exceptions;

public class AppException : Exception
{
    public int StatusCode { get; }

    public AppException(string message, int statusCode = 400) : base(message)
    {
        StatusCode = statusCode;
    }
}

public class NotFoundException : AppException
{
    public NotFoundException(string entity, object id)
        : base($"{entity} with ID '{id}' was not found.", 404) { }
}

public class UnauthorizedException : AppException
{
    public UnauthorizedException(string message = "Unauthorized")
        : base(message, 401) { }
}

public class ForbiddenException : AppException
{
    public ForbiddenException(string message = "Access denied")
        : base(message, 403) { }
}

public class ConflictException : AppException
{
    public ConflictException(string message)
        : base(message, 409) { }
}

public class TooManyRequestsException : AppException
{
    public TooManyRequestsException(string message = "Too many requests. Please try again later.")
        : base(message, 429) { }
}

public class ExternalServiceException : AppException
{
    public ExternalServiceException(string service, string message)
        : base($"{service}: {message}", 502) { }
}
