using Microsoft.EntityFrameworkCore;

public class AdminStatisticsRepository(AppDbContext db)
{
    public Task<List<Order>> GetOrders()
    {
        return db.Orders.Include(order => order.Items).AsNoTracking().ToListAsync();
    }
}
