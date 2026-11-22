using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

// Repository layer for customer orders (Place Order / Track Order).
// Every database query, insert and save for the order endpoints lives here;
// OrderService holds the rules and OrdersController only handles HTTP.
public class OrderRepository(AppDbContext db)
{
    IQueryable<Order> WithItems => db.Orders.Include(o => o.Items);

    // All orders, newest first, optionally for one customer.
    public Task<List<Order>> ListAsync(int? userId)
    {
        var query = WithItems;
        if (userId is not null) query = query.Where(o => o.UserId == userId);
        return query.OrderByDescending(o => o.CreatedAt).ToListAsync();
    }

    public Task<Order?> FindByIdAsync(int id)
        => WithItems.FirstOrDefaultAsync(o => o.Id == id);

    // The customer's latest order that is not Delivered or Cancelled.
    public Task<Order?> FindInProgressAsync(int userId)
        => WithItems
            .Where(o => o.UserId == userId
                && o.Status != OrderStatuses.Delivered
                && o.Status != OrderStatuses.Cancelled)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

    // Just the id of an order in progress, for the one-order-at-a-time check.
    public Task<int?> FindInProgressIdAsync(int userId)
        => db.Orders
            .Where(o => o.UserId == userId
                && o.Status != OrderStatuses.Delivered
                && o.Status != OrderStatuses.Cancelled)
            .Select(o => (int?)o.Id)
            .FirstOrDefaultAsync();

    public async Task<User?> FindUserAsync(int userId)
        => await db.Users.FindAsync(userId);

    // Menu items by id, for pricing an order from the server's own prices.
    public Task<Dictionary<int, MenuItem>> GetMenuItemsAsync(IEnumerable<int> ids)
        => db.MenuItems.Where(m => ids.Contains(m.Id)).ToDictionaryAsync(m => m.Id);

    public Task<IDbContextTransaction> BeginTransactionAsync()
        => db.Database.BeginTransactionAsync();

    // Coupon check for an order. CouponService.Evaluate reads the coupon tables and
    // locks the coupon row until the order commits, so it runs against this context.
    public Task<CouponResult> EvaluateCouponForOrderAsync(string code, decimal subtotal, int userId)
        => CouponService.Evaluate(db, code, subtotal, userId, lockForOrder: true);

    // Saves a new order and empties the customer's cart in the same save.
    public async Task AddOrderAndClearCartAsync(Order order)
    {
        db.Orders.Add(order);
        db.CartItems.RemoveRange(db.CartItems.IgnoreQueryFilters().Where(c => c.UserId == order.UserId));
        await db.SaveChangesAsync();
    }

    // Pending orders placed between `from` and `to` — for auto-accept.
    public Task<List<Order>> FindPendingPlacedBetweenAsync(DateTime from, DateTime to)
        => db.Orders
            .Where(o => o.Status == OrderStatuses.Pending && o.CreatedAt >= from && o.CreatedAt <= to)
            .ToListAsync();

    // Saves one order's status change plus its notification. Returns false when
    // someone else changed the order first (Status is a concurrency token), so
    // the caller can skip it instead of overwriting, e.g. a cancel at 0:00.
    public async Task<bool> SaveStatusChangeAsync(Order order, Notification notification)
    {
        db.Notifications.Add(notification);
        try
        {
            await db.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            db.Entry(order).State = EntityState.Detached;
            db.Entry(notification).State = EntityState.Detached;
            return false;
        }
    }

    public async Task AddNotificationAsync(Notification notification)
    {
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();
    }
}
