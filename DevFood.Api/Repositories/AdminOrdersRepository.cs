using Microsoft.EntityFrameworkCore;

public class AdminOrdersRepository(AppDbContext db)
{
    private IQueryable<Order> Search(string? status, string? search, int? orderId)
    {
        var query = db.Orders.AsNoTracking()
            .Where(order => order.IsDeleted == false && order.IsHiddenFromAdmin == false);

        if (status is not null)
            query = query.Where(order => order.Status == status);

        if (search is not null)
        {
            var pattern = "%" + search + "%";
            query = query.Where(order =>
                EF.Functions.ILike(order.User.FullName, pattern) ||
                order.Id.ToString().Contains(search) ||
                order.Id == orderId);
        }
        return query;
    }

    public Task<int> Count(string? status, string? search, int? orderId)
    {
        return Search(status, search, orderId).CountAsync();
    }

    public Task<List<Order>> GetPage(string? status, string? search, int? orderId, int offset, int limit)
    {
        return Search(status, search, orderId)
            .Include(order => order.Items)
            .OrderByDescending(order => order.Id)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();
    }

    public Task<List<Order>> FindVisible(List<int> ids)
    {
        return db.Orders.Where(order => ids.Contains(order.Id) && order.IsDeleted == false && order.IsHiddenFromAdmin == false).ToListAsync();
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
