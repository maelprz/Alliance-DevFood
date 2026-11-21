using Microsoft.EntityFrameworkCore;

public class AdminStatisticsService(AppDbContext db)
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
        var orders = await db.Orders
            .Include(order => order.Items)
            .AsNoTracking()
            .ToListAsync();

        var paidOrders = orders
            .Where(order => order.Status == "Delivered" && order.Payment != null && order.Payment.Status == "Paid")
            .ToList();

        var revenueByDate = paidOrders
            .GroupBy(RevenueDate)
            .ToDictionary(group => group.Key, group => group.Sum(order => order.TotalAmount));

        var today = DateTime.UtcNow.AddHours(8).Date;
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
            totalOrders = orders.Count,
            totalRevenue = paidOrders.Sum(order => order.TotalAmount),
            deliveredOrders = orders.Count(order => order.Status == "Delivered"),
            pendingOrders = orders.Count(order => order.Status == "Pending"),
            revenueData,
            foodData
        });
    }
}
