using Microsoft.EntityFrameworkCore;

public class AdminOrdersService(AppDbContext db)
{

    public async Task<ServiceResult> Get(int page = 1, string? search = null, string status = "All")
    {
        const int pageSize = 10;
        var query = db.Orders.AsNoTracking().Where(order => order.IsHiddenFromAdmin == false);

        if (status != "All")
            query = query.Where(order => order.Status == status);

        if (string.IsNullOrWhiteSpace(search) == false)
        {
            var text = search.Trim();
            var pattern = "%" + text + "%";
            var orderText = text;
            if (orderText.StartsWith("ORD-", StringComparison.OrdinalIgnoreCase))
                orderText = orderText.Substring(4);

            var orderId = -1;
            if (int.TryParse(orderText, out var parsedId))
                orderId = parsedId;

            query = query.Where(order =>
                EF.Functions.ILike(order.User.FullName, pattern) ||
                order.Id.ToString().Contains(text) ||
                order.Id == orderId);
        }

        var total = await query.CountAsync();
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var currentPage = Math.Clamp(page, 1, totalPages);
        var orders = await query
            .Include(order => order.Items)
            .OrderByDescending(order => order.Id)
            .Skip((currentPage - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return ServiceResults.Ok(new
        {
            orders = orders.Select(OrdersController.ToDto),
            total,
            page = currentPage,
            totalPages
        });
    }

    public async Task<ServiceResult> HideOrders(List<int> orderIds)
    {
        if (orderIds == null || orderIds.Count == 0)
            return ServiceResults.BadRequest(new { message = "Select at least one order." });

        var ids = orderIds.Distinct().ToList();
        var orders = await db.Orders
            .Where(order => ids.Contains(order.Id) && order.IsHiddenFromAdmin == false)
            .ToListAsync();

        if (orders.Count != ids.Count)
            return ServiceResults.NotFound(new { message = "One or more orders could not be found. Refresh and try again." });

        if (orders.Any(order => order.Status != "Cancelled"))
            return ServiceResults.BadRequest(new { message = "Only cancelled orders can be removed from the admin list." });

        foreach (var order in orders)
        {
            order.IsHiddenFromAdmin = true;
        }

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            return ServiceResults.Conflict(new { message = "An order changed. Refresh and try again." });
        }

        return ServiceResults.Ok(new { message = "Selected orders removed from the admin list." });
    }
    private static readonly string[] Statuses = ["Pending", "Preparing", "Ready", "Delivered", "Cancelled"];

    public async Task<ServiceResult> UpdateStatus(int id, OrderPatch req, System.Security.Claims.ClaimsPrincipal user)
    {
        var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return ServiceResults.NotFound(new { message = "Order not found." });
        var status = Statuses.FirstOrDefault(s => s.Equals(req.Status, StringComparison.OrdinalIgnoreCase));
        if (status is null) return ServiceResults.BadRequest(new { message = "Unknown order status." });

        var byCustomer = user.IsAdmin() == false;
        if (byCustomer)
        {
            if (user.UserId() != order.UserId) return ServiceResults.Forbid();
            if (status != "Cancelled" || order.Status != "Pending")
                return ServiceResults.BadRequest(new { message = "You can only cancel your own pending order." });
        }
        else
        {
            if (status == "Cancelled")
                return ServiceResults.BadRequest(new { message = "Only the customer can cancel an order." });
            if (order.Status == "Cancelled" || order.Status == "Delivered")
                return ServiceResults.BadRequest(new { message = "Completed or cancelled orders cannot be changed." });

            var nextStatus = "";
            if (order.Status == "Pending") nextStatus = "Preparing";
            if (order.Status == "Preparing") nextStatus = "Ready";
            if (order.Status == "Ready") nextStatus = "Delivered";

            if (status != order.Status && status != nextStatus)
                return ServiceResults.BadRequest(new { message = "Orders must follow Pending, Preparing, Ready, then Delivered." });
        }

        if (status != order.Status)
        {
            order.Status = status;
            if (status == "Delivered")
            {
                order.DeliveredAt = DateTime.UtcNow;
            }
            if (order.Payment is { } payment)
            {
                if (status == "Delivered") payment.Status = "Paid";
                else if (status == "Cancelled") payment.Status = "Voided";
            }
            if (byCustomer == false)
                db.Notifications.Add(new Notification
                {
                    UserId = order.UserId,
                    Type = "order_status",
                    Title = "Order Update",
                    Message = $"Your order #{order.Id} is now {status}.",
                    Audience = "user"
                });
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return ServiceResults.Conflict(new { message = "The order status changed. Refresh and try again." });
            }
        }
        return ServiceResults.Ok(OrdersController.ToDto(order));
    }

}

