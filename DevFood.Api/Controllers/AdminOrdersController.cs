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
        var query = db.Orders.AsNoTracking().AsQueryable();

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
}

