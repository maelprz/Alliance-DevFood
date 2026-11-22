using Microsoft.EntityFrameworkCore;

public record AdminOrderPage(List<Order> Items, int Total, int Page, int TotalPages);

public class AdminOrdersRepository(AppDbContext db)
{
    public async Task<AdminOrderPage> GetPage(int page, string? search, string status)
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

        return new AdminOrderPage(orders, total, currentPage, totalPages);
    }

    public Task<List<Order>> FindVisible(List<int> ids)
    {
        return db.Orders.Where(order => ids.Contains(order.Id) && order.IsHiddenFromAdmin == false).ToListAsync();
    }

    public Task<Order?> Find(int id)
    {
        return db.Orders.Include(order => order.Items).FirstOrDefaultAsync(order => order.Id == id);
    }

    public async Task Save()
    {
        await db.SaveChangesAsync();
    }

    public async Task SaveStatus(Notification? notification)
    {
        if (notification is not null) db.Notifications.Add(notification);
        await db.SaveChangesAsync();
    }
}
