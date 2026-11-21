public record ServiceResult(int StatusCode, object Value);

public static class ServiceResults
{
    public static ServiceResult Ok(object value) => new(200, value);
    public static ServiceResult BadRequest(object value) => new(400, value);
    public static ServiceResult NotFound(object value) => new(404, value);
    public static ServiceResult Forbid() => new(403, "Forbidden");
    public static ServiceResult Conflict(object value) => new(409, value);
    public static ServiceResult StatusCode(int statusCode, object value) => new(statusCode, value);
}
