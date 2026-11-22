using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

public class CartRepository(AppDbContext db)
{
    public Task<IDbContextTransaction> BeginTransactionAsync()
        => db.Database.BeginTransactionAsync();

    // Cart saves and checkout acquire the same lock even when the cart is empty.
    public async Task LockUserAsync(int userId)
        => await db.Database.SqlQuery<int>($"SELECT id FROM users WHERE id = {userId} FOR NO KEY UPDATE").ToListAsync();

    public Task<List<CartItem>> ListAsync(int userId)
        => db.CartItems.AsNoTracking().Include(item => item.MenuItem)
            .Where(item => item.UserId == userId).OrderBy(item => item.Id).ToListAsync();

    public async Task<HashSet<int>> GetMenuItemIdsAsync(int[] ids)
        => (await db.MenuItems.Where(item => ids.Contains(item.Id)).Select(item => item.Id).ToListAsync()).ToHashSet();

    public Task<List<CartItem>> LoadForUpdateAsync(int userId)
        => db.CartItems.IgnoreQueryFilters().Where(item => item.UserId == userId).ToListAsync();

    public void AddRange(IEnumerable<CartItem> items) => db.CartItems.AddRange(items);

    public void RemoveRange(IEnumerable<CartItem> items) => db.CartItems.RemoveRange(items);

    public Task DeleteByUserAsync(int userId)
        => db.CartItems.IgnoreQueryFilters().Where(item => item.UserId == userId).ExecuteDeleteAsync();

    public Task SaveAsync() => db.SaveChangesAsync();
}
