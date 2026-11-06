using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/admin/statistics")]
[Authorize(Roles = "admin")]
public class AdminStatisticsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var orders = await db.Orders
            .Include(order => order.Items)
            .AsNoTracking()
            .ToListAsync();

        var revenueData = orders
            .GroupBy(order => order.CreatedAt.Date)
            .OrderBy(group => group.Key)
            .Select(group => new
            {
                date = group.Key.ToString("yyyy-MM-dd"),
                revenue = group.Sum(order => order.TotalAmount)
            });

        var foodData = orders
            .SelectMany(order => order.Items)
            .GroupBy(item => item.Name)
            .Select(group => new
            {
                name = group.Key,
                quantity = group.Sum(item => item.Quantity)
            })
            .OrderByDescending(item => item.quantity);

        return Ok(new
        {
            totalOrders = orders.Count,
            totalRevenue = orders.Sum(order => order.TotalAmount),
            deliveredOrders = orders.Count(order => order.Status == "Delivered"),
            pendingOrders = orders.Count(order => order.Status == "Pending"),
            revenueData,
            foodData
        });
    }
}
