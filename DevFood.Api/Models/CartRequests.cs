using System.Text.Json.Serialization;

public record CartLine(
    [property: JsonPropertyName("food_id")] int FoodId,
    int Quantity);

public record CartPut(List<CartLine?>? Items);

public record ApplyCouponRequest(string? Code, decimal? Subtotal);
