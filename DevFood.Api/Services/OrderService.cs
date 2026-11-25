using System.Security.Claims;

// Service layer for customer orders (Place Order / Track Order).
// All business rules live here: who may order, the delivery zone, one order in
// progress per account, Cash on Delivery only, server-side prices, coupons and
// the "Order Confirmed" notification. Database work goes through OrderRepository.
public class OrderService(OrderRepository orders, IConfiguration config, AdminOrdersService adminOrders,
    CouponService coupons, CartRepository cartRepository, CartService cart)
{
    // Seconds the customer can still cancel. Worked out on the server, so a
    // wrong clock on the customer's computer doesn't matter.
    public static int CancelSecondsLeft(Order o)
    {
        if (o.Status != OrderStatuses.Pending) return 0;
        var elapsed = (DateTime.UtcNow - o.CreatedAt).TotalSeconds;
        return Math.Max(0, (int)Math.Ceiling(OrderRules.CancelWindowSeconds - elapsed));
    }

    // Order as JSON for the frontend (snake_case names the React code reads).
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
        cancel_seconds_left = CancelSecondsLeft(o),
        cancel_window_seconds = OrderRules.CancelWindowSeconds,
        items = o.Items.OrderBy(i => i.Id).Select(i => new
        {
            order_item_id = i.Id,
            order_id = o.Id,
            food_id = i.MenuItemId,
            name = i.Name,
            price = i.Price,
            quantity = i.Quantity
        }),
        payment = new
        {
            payment_id = o.Payment?.Id,
            payment_method = o.Payment?.PaymentMethod,
            status = o.Payment?.Status
        }
    };

    public async Task<ServiceResult> GetAll(int? userId)
    {
        var list = await orders.ListAsync(userId);
        return ServiceResults.Ok(list.Select(ToDto));
    }

    // The customer's order in progress as a DTO, or null when there is none.
    public async Task<object?> GetInProgress(int userId)
    {
        var order = await orders.FindInProgressAsync(userId);
        return order is null ? null : ToDto(order);
    }

    public async Task<ServiceResult> Get(int id)
    {
        var order = await orders.FindByIdAsync(id);
        return order is null
            ? ServiceResults.NotFound(new { message = "Order not found." })
            : ServiceResults.Ok(ToDto(order));
    }

    // Status changes (customer cancel, admin steps). The cancel-window rules are
    // checked here; everything else is AdminOrdersService's, unchanged.
    public async Task<ServiceResult> UpdateStatus(int id, OrderPatch req, ClaimsPrincipal user)
    {
        var order = await orders.FindByIdAsync(id);
        if (order is not null && order.Status == OrderStatuses.Pending)
        {
            var left = CancelSecondsLeft(order);
            var wanted = req.Status ?? "";
            var isOwner = user.UserId() == order.UserId;

            if (!user.IsAdmin() && isOwner && left == 0
                && wanted.Equals(OrderStatuses.Cancelled, StringComparison.OrdinalIgnoreCase))
                return ServiceResults.BadRequest(new { message = "The cancel window has ended. The kitchen is starting your order." });

            if (user.IsAdmin() && left > 0
                && wanted.Equals(OrderStatuses.Preparing, StringComparison.OrdinalIgnoreCase))
                return ServiceResults.BadRequest(new { message = $"The customer can still cancel for {left} more seconds." });
        }
        return await adminOrders.UpdateStatus(id, req, user);
    }

    // The kitchen accepts orders whose cancel window has ended (run by
    // OrderAutoAcceptService). Sends the same "Order Update" notification the
    // admin's status change sends. Returns how many orders were accepted.
    public async Task<int> AutoAcceptExpiredAsync()
    {
        // Window ended (placed 30+ seconds ago), but only recent orders: old,
        // forgotten Pending orders are left for the admin.
        var now = DateTime.UtcNow;
        var windowEnded = now.AddSeconds(-OrderRules.CancelWindowSeconds);
        var oldest = now.AddMinutes(-OrderRules.AutoAcceptMaxAgeMinutes);
        var accepted = 0;
        foreach (var order in await orders.FindPendingPlacedBetweenAsync(oldest, windowEnded))
        {
            order.Status = OrderStatuses.Preparing;
            var saved = await orders.SaveStatusChangeAsync(order, new Notification
            {
                UserId = order.UserId,
                Type = NotificationTypes.OrderStatus,
                Title = NotificationTitles.OrderUpdate,
                Message = $"Your order {OrderRules.FormatId(order.Id)} is now {OrderStatuses.Preparing}.",
                Audience = NotificationAudiences.User
            });
            if (saved) accepted++;
        }
        return accepted;
    }

    // Places an order. Only the fields the server trusts are read from the request;
    // ids, prices and totals are recomputed here from the menu and coupon tables.
    public async Task<ServiceResult> Create(OrderCreate req, int? userId)
    {
        if (req.Order is null || req.Items is null || req.Items.Count == 0)
            return ServiceResults.BadRequest(new { message = "An order needs a user and at least one item." });
        if (userId is null) return ServiceResults.StatusCode(401, new { message = "Please log in." });
        if (req.Order.UserId != userId.Value) return ServiceResults.Forbid();
        var user = await orders.FindUserAsync(userId.Value);
        if (user is null || !user.IsActive) return ServiceResults.NotFound(new { message = "User not found." });
        if (string.IsNullOrWhiteSpace(req.Order.DeliveryAddress))
            return ServiceResults.BadRequest(new { message = "Delivery address is required." });

        // Delivery zone: the map pin must be within range of the store.
        // Checked here too, because the browser check alone can be bypassed.
        var (lat, lng) = (req.Order.DeliveryLat, req.Order.DeliveryLng);
        if (lat is null || lng is null || lat is < -90 or > 90 || lng is < -180 or > 180)
            return ServiceResults.BadRequest(new { message = "Pick your delivery spot on the map." });
        var zone = DeliveryZone.From(config);
        var km = zone.DistanceKm(lat.Value, lng.Value);
        if (km > zone.MaxKm)
            return ServiceResults.BadRequest(new { message = $"This spot is {km:0.0} km away. We only deliver within {zone.MaxKm:0.#} km." });
        var method = req.Payment?.PaymentMethod ?? "";
        if (!PaymentMethods.All.Contains(method))
            return ServiceResults.BadRequest(new { message = "We only accept Cash on Delivery." });

        var lines = req.Items
            .Where(i => i.Quantity >= 1)
            .GroupBy(i => i.FoodId)
            .Select(g => new OrderLine(g.Key, g.Sum(x => x.Quantity)))
            .ToList();
        var menu = await orders.GetMenuItemsAsync(lines.Select(l => l.FoodId).ToList());
        var missing = lines.FirstOrDefault(l => !menu.TryGetValue(l.FoodId, out var m) || !m.IsAvailable);
        if (missing is not null)
            return ServiceResults.BadRequest(new { message = "One or more items are no longer available." });

        var order = new Order
        {
            UserId = user.Id,
            CustomerName = user.FullName,
            DeliveryAddress = req.Order.DeliveryAddress.Trim(),
            DeliveryLat = lat,
            DeliveryLng = lng,
            Payment = new Payment { PaymentMethod = method, Status = PaymentStatuses.Unpaid },
            DeliveryFee = zone.FeeFor(km),
            Items = lines.Select(l => new OrderItem
            {
                MenuItemId = l.FoodId,
                Name = menu[l.FoodId].Name,
                Price = menu[l.FoodId].Price,
                Quantity = l.Quantity
            }).ToList()
        };
        order.Subtotal = order.Items.Sum(i => i.Price * i.Quantity);

        await using var transaction = await orders.BeginTransactionAsync();
        await cartRepository.LockUserAsync(user.Id);
        // Recheck under the cart lock so simultaneous checkouts cannot both place an order.
        var inProgressId = await orders.FindInProgressIdAsync(user.Id);
        if (inProgressId is not null)
            return ServiceResults.Conflict(new { message = $"You already have an order in progress ({OrderRules.FormatId(inProgressId.Value)}). You can order again once it's delivered." });

        if (!string.IsNullOrWhiteSpace(req.Order.CouponCode))
        {
            var result = await coupons.EvaluateAsync(req.Order.CouponCode, order.Subtotal, user.Id, lockForOrder: true);
            if (result.Coupon is null) return ServiceResults.BadRequest(new { message = result.Error });
            order.CouponCode = result.Coupon.Code;
            order.DiscountAmount = result.Discount;
        }
        order.TotalAmount = order.Subtotal - order.DiscountAmount + order.DeliveryFee;

        await orders.AddOrderAsync(order);
        await cart.ClearAsync(user.Id);

        // Order Confirmed notification (needs the generated order id, hence the second save).
        await orders.AddNotificationAsync(new Notification
        {
            UserId = user.Id,
            Type = NotificationTypes.OrderConfirmed,
            Title = NotificationTitles.OrderConfirmed,
            Message = $"Your order {OrderRules.FormatId(order.Id)} has been placed. Total: ₱{order.TotalAmount:0.00}.",
            Audience = NotificationAudiences.User
        });
        await transaction.CommitAsync();

        return ServiceResults.StatusCode(201, ToDto(order));
    }
}
