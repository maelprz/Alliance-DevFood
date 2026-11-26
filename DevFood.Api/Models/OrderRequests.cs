using System.Text.Json.Serialization;

// prices/totals from client are ignored, server computes them
public record OrderHeader(
    [property: JsonPropertyName("user_id")] int UserId,
    [property: JsonPropertyName("coupon_code")] string? CouponCode,
    [property: JsonPropertyName("delivery_address")] string? DeliveryAddress,
    [property: JsonPropertyName("delivery_lat")] double? DeliveryLat = null,
    [property: JsonPropertyName("delivery_lng")] double? DeliveryLng = null);

public record OrderLine(
    [property: JsonPropertyName("food_id")] int FoodId,
    [property: JsonPropertyName("quantity")] int Quantity);

public record OrderPayment(
    [property: JsonPropertyName("payment_method")] string? PaymentMethod);

public record OrderCreate(OrderHeader? Order, List<OrderLine>? Items, OrderPayment? Payment);

public record OrderPatch(string? Status, string? Actor);
