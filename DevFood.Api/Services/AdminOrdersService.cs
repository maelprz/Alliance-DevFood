using Microsoft.EntityFrameworkCore;

public class AdminOrdersService(AdminOrdersRepository repository)
{

    public async Task<ServiceResult> Get(int page = 1, string? search = null, string status = "All")
    {
        var result = await repository.GetPage(page, search, status);
        var orders = result.Items;
        var total = result.Total;
        var currentPage = result.Page;
        var totalPages = result.TotalPages;

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
        var orders = await repository.FindVisible(ids);

        if (orders.Count != ids.Count)
            return ServiceResults.NotFound(new { message = "One or more orders could not be found. Refresh and try again." });

        if (orders.Any(order => order.Status != OrderStatuses.Cancelled))
            return ServiceResults.BadRequest(new { message = "Only cancelled orders can be removed from the admin list." });

        foreach (var order in orders)
        {
            order.IsDeleted = true;
            order.IsHiddenFromAdmin = true;
        }

        try
        {
            await repository.Save();
        }
        catch (DbUpdateConcurrencyException)
        {
            return ServiceResults.Conflict(new { message = "An order changed. Refresh and try again." });
        }

        return ServiceResults.Ok(new { message = "Selected orders removed from the admin list." });
    }
    private static readonly string[] Statuses = [OrderStatuses.Pending, OrderStatuses.Preparing, OrderStatuses.Ready, OrderStatuses.Delivered, OrderStatuses.Cancelled];

    public async Task<ServiceResult> UpdateStatus(int id, OrderPatch req, System.Security.Claims.ClaimsPrincipal user)
    {
        var order = await repository.Find(id);
        if (order is null) return ServiceResults.NotFound(new { message = "Order not found." });
        var status = Statuses.FirstOrDefault(s => s.Equals(req.Status, StringComparison.OrdinalIgnoreCase));
        if (status is null) return ServiceResults.BadRequest(new { message = "Unknown order status." });

        var byCustomer = user.IsAdmin() == false;
        if (byCustomer)
        {
            if (user.UserId() != order.UserId) return ServiceResults.Forbid();
            if (status != OrderStatuses.Cancelled || order.Status != OrderStatuses.Pending)
                return ServiceResults.BadRequest(new { message = "You can only cancel your own pending order." });
        }
        else
        {
            if (status == OrderStatuses.Cancelled)
                return ServiceResults.BadRequest(new { message = "Only the customer can cancel an order." });
            if (order.Status == OrderStatuses.Cancelled || order.Status == OrderStatuses.Delivered)
                return ServiceResults.BadRequest(new { message = "Completed or cancelled orders cannot be changed." });

            var nextStatus = "";
            if (order.Status == OrderStatuses.Pending) nextStatus = OrderStatuses.Preparing;
            if (order.Status == OrderStatuses.Preparing) nextStatus = OrderStatuses.Ready;
            if (order.Status == OrderStatuses.Ready) nextStatus = OrderStatuses.Delivered;

            if (status != order.Status && status != nextStatus)
                return ServiceResults.BadRequest(new { message = "Orders must follow Pending, Preparing, Ready, then Delivered." });
        }

        if (status != order.Status)
        {
            order.Status = status;
            if (status == OrderStatuses.Delivered)
            {
                order.DeliveredAt = DateTime.UtcNow;
            }
            if (order.Payment is { } payment)
            {
                if (status == OrderStatuses.Delivered) payment.Status = PaymentStatuses.Paid;
                else if (status == OrderStatuses.Cancelled) payment.Status = PaymentStatuses.Voided;
            }
            Notification? notification = null;
            if (byCustomer == false)
                notification = new Notification
                {
                    UserId = order.UserId,
                    Type = NotificationTypes.OrderStatus,
                    Title = "Order Update",
                    Message = $"Your order #{order.Id} is now {status}.",
                    Audience = NotificationAudiences.User
                };
            try
            {
                await repository.SaveStatus(notification);
            }
            catch (DbUpdateConcurrencyException)
            {
                return ServiceResults.Conflict(new { message = "The order status changed. Refresh and try again." });
            }
        }
        return ServiceResults.Ok(OrdersController.ToDto(order));
    }

}

