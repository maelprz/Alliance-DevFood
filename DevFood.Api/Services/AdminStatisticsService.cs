using Microsoft.EntityFrameworkCore;

public class AdminStatisticsService(AdminStatisticsRepository repository)
{
    private static DateTime RevenueDate(Order order)
    {
        if (order.DeliveredAt.HasValue)
        {
            return order.DeliveredAt.Value.AddHours(8).Date;
        }

        return order.CreatedAt.AddHours(8).Date;
    }

    public async Task<ServiceResult> Get()
    {
        var orders = await repository.GetOrders();

        var paidOrders = orders
            .Where(order => order.Status == OrderStatuses.Delivered && order.Payment != null && order.Payment.Status == PaymentStatuses.Paid)
            .ToList();

        var revenueByDate = paidOrders
            .GroupBy(RevenueDate)
            .ToDictionary(group => group.Key, group => group.Sum(order => order.TotalAmount));

        var today = DateTime.UtcNow.AddHours(8).Date;
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var nextMonth = monthStart.AddMonths(1);
        var monthlyOrders = orders
            .Where(order => order.CreatedAt.AddHours(8) >= monthStart && order.CreatedAt.AddHours(8) < nextMonth)
            .ToList();
        var monthlyDeliveredOrders = orders
            .Where(order => order.Status == OrderStatuses.Delivered && RevenueDate(order) >= monthStart && RevenueDate(order) < nextMonth)
            .ToList();
        var monthlyPaidOrders = monthlyDeliveredOrders
            .Where(order => order.Payment != null && order.Payment.Status == PaymentStatuses.Paid)
            .ToList();

        var revenueData = new List<object>();
        for (var daysAgo = 6; daysAgo >= 0; daysAgo = daysAgo - 1)
        {
            var date = today.AddDays(0 - daysAgo);
            decimal revenue = 0;
            if (revenueByDate.TryGetValue(date, out var amount))
            {
                revenue = amount;
            }

            revenueData.Add(new { date = date.ToString("yyyy-MM-dd"), revenue });
        }

        var items = paidOrders.SelectMany(order => order.Items).ToList();
        var foodData = items
            .Where(item => item.MenuItemId.HasValue)
            .GroupBy(item => item.MenuItemId)
            .Select(group => new
            {
                name = group.First().Name,
                quantity = group.Sum(item => item.Quantity)
            })
            .Concat(items
                .Where(item => item.MenuItemId.HasValue == false)
                .GroupBy(item => item.Name)
                .Select(group => new
                {
                    name = group.Key,
                    quantity = group.Sum(item => item.Quantity)
                }))
            .OrderByDescending(item => item.quantity)
            .ThenBy(item => item.name)
            .Take(5);

        return ServiceResults.Ok(new
        {
            totalOrders = monthlyOrders.Count,
            totalRevenue = monthlyPaidOrders.Sum(order => order.TotalAmount),
            deliveredOrders = monthlyDeliveredOrders.Count,
            pendingOrders = monthlyOrders.Count(order => order.Status == OrderStatuses.Pending),
            revenueData,
            foodData
        });
    }
}
