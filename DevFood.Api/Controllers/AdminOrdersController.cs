using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "admin")]
public class AdminOrdersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int page = 1, [FromQuery] string? search = null, [FromQuery] string status = "All")
    {
        const int pageSize = 10;
        var query = db.Orders.AsNoTracking().Where(order => order.IsHiddenFromAdmin == false);

        if (status != "All")
            query = query.Where(order => order.Status == status);

        if (string.IsNullOrWhiteSpace(search) == false)
        {
            var text = search.Trim();
            var pattern = "%" + text + "%";
            query = query.Where(order =>
                EF.Functions.ILike(order.User.FullName, pattern) ||
                order.Id.ToString().Contains(text));
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

        return Ok(new
        {
            orders = orders.Select(OrdersController.ToDto),
            total,
            page = currentPage,
            totalPages
        });
    }
    [HttpPost("hide")]
    public async Task<IActionResult> HideOrders([FromBody] List<int> orderIds)
    {
        if (orderIds == null || orderIds.Count == 0)
            return BadRequest(new { message = "Select at least one order." });

        var ids = orderIds.Distinct().ToList();
        var orders = await db.Orders
            .Where(order => ids.Contains(order.Id) && order.IsHiddenFromAdmin == false)
            .ToListAsync();

        if (orders.Count != ids.Count)
            return NotFound(new { message = "One or more orders could not be found. Refresh and try again." });

        if (orders.Any(order => order.Status != "Cancelled"))
            return BadRequest(new { message = "Only cancelled orders can be removed from the admin list." });

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
            return Conflict(new { message = "An order changed. Refresh and try again." });
        }

        return Ok(new { message = "Selected orders removed from the admin list." });
    }
}

