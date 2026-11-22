using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

// Only the fields the server trusts are bound; ids, prices and totals sent by the
// client (order_id, order_item_id, subtotal, total_amount...) are ignored and recomputed.
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

[ApiController]
[Route("api/orders")]
// Controller layer: reads the request, calls OrderService and turns the result
// into an HTTP response. No business logic or database access here — see
// Services/OrderService.cs and Repositories/OrderRepository.cs.
public class OrdersController(OrderService orderService) : ControllerBase
{
    // Kept so AdminOrdersService can keep calling OrdersController.ToDto.
    public static object ToDto(Order o) => OrderService.ToDto(o);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery(Name = "user_id")] int? userId)
        => Send(await orderService.GetAll(userId));

    // The user's latest order that is still in progress, or JSON null.
    [HttpGet("active")]
    public async Task<IActionResult> Active([FromQuery(Name = "user_id")] int userId)
    {
        var order = await orderService.GetInProgress(userId);
        // Ok(null) would become an empty 204, which breaks the frontend's r.json().
        return order is null ? Content("null", "application/json") : Ok(order);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
        => Send(await orderService.Get(id));

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create(OrderCreate req)
        => Send(await orderService.Create(req, User.UserId()));

    [Authorize]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Patch(int id, OrderPatch req)
        => Send(await orderService.UpdateStatus(id, req, User));

    IActionResult Send(ServiceResult result) => result.StatusCode switch
    {
        401 => Unauthorized(),
        403 => Forbid(),
        _ => StatusCode(result.StatusCode, result.Value),
    };
}
