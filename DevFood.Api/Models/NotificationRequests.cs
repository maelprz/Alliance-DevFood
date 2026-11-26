using System.Text.Json.Serialization;

public record NotificationCreate(string? Title, string? Message, string? Audience, string? CouponCode);

public record NotificationReadRequest(
    [property: JsonPropertyName("user_id")] int UserId);
