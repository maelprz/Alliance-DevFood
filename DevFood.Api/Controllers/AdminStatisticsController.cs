using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/admin/statistics")]
[Authorize(Roles = "admin")]
public class AdminStatisticsController(AppDbContext db) : ControllerBase
{
    private static DateTime RevenueDate(Order order)
    {
        if (order.DeliveredAt.HasValue)
        {
            return order.DeliveredAt.Value.AddHours(8).Date;
        }

        return order.CreatedAt.AddHours(8).Date;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var orders = await db.Orders
            .Include(order => order.Items)
            .AsNoTracking()
            .ToListAsync();

        var paidOrders = orders
            .Where(order => order.Status == "Delivered" && order.Payment != null && order.Payment.Status == "Paid")
            .ToList();

        var revenueData = paidOrders
            .GroupBy(RevenueDate)
            .OrderBy(group => group.Key)
            .Select(group => new
            {
                date = group.Key.ToString("yyyy-MM-dd"),
                revenue = group.Sum(order => order.TotalAmount)
            });

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
            .OrderByDescending(item => item.quantity);

        return Ok(new
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
