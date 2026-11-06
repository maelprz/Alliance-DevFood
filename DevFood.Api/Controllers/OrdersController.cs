using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
public class OrdersController(AppDbContext db, IConfiguration config) : ControllerBase
{
    public const decimal DeliveryFee = 49.00m;
    static readonly string[] Statuses = ["Pending", "Preparing", "Ready", "Delivered", "Cancelled"];
    static readonly string[] PaymentMethods = ["credit-card", "gcash", "cod"];

    public static object ToDto(Order o) => new
    {
        order_id = o.Id,
        user_id = o.UserId,
        customerName = o.CustomerName,
        status = o.Status,
        subtotal = o.Subtotal,
        delivery_fee = o.DeliveryFee,
        coupon_code = o.CouponCode,
        discount_amount = o.DiscountAmount,
        total_amount = o.TotalAmount,
        delivery_address = o.DeliveryAddress,
        delivery_lat = o.DeliveryLat,
        delivery_lng = o.DeliveryLng,
        created_at = o.CreatedAt,
        items = o.Items.OrderBy(i => i.Id).Select(i => new
        {
            order_item_id = i.Id,
            order_id = o.Id,
            food_id = i.MenuItemId,
            name = i.Name,
            price = i.Price,
            quantity = i.Quantity
        }),
        payment = new { payment_method = o.PaymentMethod }
    };

    IQueryable<Order> WithItems => db.Orders.Include(o => o.Items);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery(Name = "user_id")] int? userId)
    {
        var query = WithItems;
        if (userId is not null) query = query.Where(o => o.UserId == userId);
        var orders = await query.OrderByDescending(o => o.CreatedAt).ToListAsync();
        return Ok(orders.Select(ToDto));
    }

    // The user's latest order that is still in progress, or JSON null.
    [HttpGet("active")]
    public async Task<IActionResult> Active([FromQuery(Name = "user_id")] int userId)
    {
        var order = await WithItems
            .Where(o => o.UserId == userId && o.Status != "Delivered" && o.Status != "Cancelled")
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();
        // Ok(null) would become an empty 204, which breaks the frontend's r.json().
        return order is null ? Content("null", "application/json") : Ok(ToDto(order));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var order = await WithItems.FirstOrDefaultAsync(o => o.Id == id);
        return order is null ? NotFound(new { message = "Order not found." }) : Ok(ToDto(order));
    }

    [HttpPost]
    public async Task<IActionResult> Create(OrderCreate req)
    {
        if (req.Order is null || req.Items is null || req.Items.Count == 0)
            return BadRequest(new { message = "An order needs a user and at least one item." });
        var user = await db.Users.FindAsync(req.Order.UserId);
        if (user is null || !user.IsActive) return NotFound(new { message = "User not found." });
        if (string.IsNullOrWhiteSpace(req.Order.DeliveryAddress))
            return BadRequest(new { message = "Delivery address is required." });

        // Delivery zone: the map pin must be within range of the store.
        // Checked here too, because the browser check alone can be bypassed.
        var (lat, lng) = (req.Order.DeliveryLat, req.Order.DeliveryLng);
        if (lat is null || lng is null || lat is < -90 or > 90 || lng is < -180 or > 180)
            return BadRequest(new { message = "Pick your delivery spot on the map." });
        var zone = DeliveryZone.From(config);
        var km = zone.DistanceKm(lat.Value, lng.Value);
        if (km > zone.MaxKm)
            return BadRequest(new { message = $"This spot is {km:0.0} km away. We only deliver within {zone.MaxKm:0.#} km." });
        var method = req.Payment?.PaymentMethod ?? "";
        if (!PaymentMethods.Contains(method))
            return BadRequest(new { message = "Unknown payment method." });

        var lines = req.Items
            .Where(i => i.Quantity >= 1)
            .GroupBy(i => i.FoodId)
            .Select(g => new OrderLine(g.Key, g.Sum(x => x.Quantity)))
            .ToList();
        var ids = lines.Select(l => l.FoodId).ToList();
        var menu = await db.MenuItems.Where(m => ids.Contains(m.Id)).ToDictionaryAsync(m => m.Id);
        var missing = lines.FirstOrDefault(l => !menu.TryGetValue(l.FoodId, out var m) || !m.IsAvailable);
        if (missing is not null)
            return BadRequest(new { message = "One or more items are no longer available." });

        var order = new Order
        {
            UserId = user.Id,
            CustomerName = user.FullName,
            DeliveryAddress = req.Order.DeliveryAddress.Trim(),
            DeliveryLat = lat,
            DeliveryLng = lng,
            PaymentMethod = method,
            DeliveryFee = DeliveryFee,
            Items = lines.Select(l => new OrderItem
            {
                MenuItemId = l.FoodId,
                Name = menu[l.FoodId].Name,
                Price = menu[l.FoodId].Price,
                Quantity = l.Quantity
            }).ToList()
        };
        order.Subtotal = order.Items.Sum(i => i.Price * i.Quantity);

        if (!string.IsNullOrWhiteSpace(req.Order.CouponCode))
        {
            var (coupon, error) = await CartController.FindValidCoupon(db, req.Order.CouponCode, order.Subtotal);
            if (coupon is null) return BadRequest(new { message = error });
            order.CouponCode = coupon.Code;
            order.DiscountAmount = Math.Round(order.Subtotal * coupon.DiscountPercent / 100m, 2);
        }
        order.TotalAmount = order.Subtotal - order.DiscountAmount + order.DeliveryFee;

        db.Orders.Add(order);
        db.CartItems.RemoveRange(db.CartItems.IgnoreQueryFilters().Where(c => c.UserId == user.Id));
        await db.SaveChangesAsync();

        // Order Confirmed notification (needs the generated order id, hence the second save).
        db.Notifications.Add(new Notification
        {
            UserId = user.Id,
            Type = "order_confirmed",
            Title = "Order Confirmed",
            Message = $"Your order #{order.Id} has been placed. Total: ₱{order.TotalAmount:0.00}.",
            Audience = "user"
        });
        await db.SaveChangesAsync();

        return StatusCode(201, ToDto(order));
    }

    [Authorize]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Patch(int id, OrderPatch req)
    {
        var order = await WithItems.FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound(new { message = "Order not found." });
        var status = Statuses.FirstOrDefault(s => s.Equals(req.Status, StringComparison.OrdinalIgnoreCase));
        if (status is null) return BadRequest(new { message = "Unknown order status." });

        var byCustomer = User.IsAdmin() == false;
        if (byCustomer)
        {
            if (User.UserId() != order.UserId) return Forbid();
            if (status != "Cancelled" || order.Status != "Pending")
                return BadRequest(new { message = "You can only cancel your own pending order." });
        }
        else
        {
            if (status == "Cancelled")
                return BadRequest(new { message = "Only the customer can cancel an order." });
            if (order.Status == "Cancelled" || order.Status == "Delivered")
                return BadRequest(new { message = "Completed or cancelled orders cannot be changed." });
        }

        if (status != order.Status)
        {
            order.Status = status;
            if (!byCustomer)
                db.Notifications.Add(new Notification
                {
                    UserId = order.UserId,
                    Type = "order_status",
                    Title = "Order Update",
                    Message = $"Your order #{order.Id} is now {status}.",
                    Audience = "user"
                });
            await db.SaveChangesAsync();
        }
        return Ok(ToDto(order));
    }

}
