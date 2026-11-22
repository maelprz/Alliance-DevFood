using Microsoft.EntityFrameworkCore;

public class AdminCouponsRepository(AppDbContext db)
{
    public Task<Dictionary<string, int>> GetUsage()
    {
        return db.Orders
            .Where(order => order.CouponCode != null && order.Status != OrderStatuses.Cancelled)
            .GroupBy(order => order.CouponCode!)
            .Select(group => new { Code = group.Key, Count = group.Count() })
            .ToDictionaryAsync(group => group.Code, group => group.Count);
    }

    public Task<List<Coupon>> GetAll()
    {
        return db.Coupons.OrderByDescending(coupon => coupon.ExpiresAt).ThenBy(coupon => coupon.Code).ToListAsync();
    }

    public Task<int> Count()
    {
        return db.Coupons.CountAsync();
    }

    public Task<List<Coupon>> GetPage(int page, int pageSize)
    {
        return db.Coupons.OrderByDescending(coupon => coupon.Id).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
    }

    public Task<bool> CodeExists(string code)
    {
        return db.Coupons.IgnoreQueryFilters().AnyAsync(coupon => coupon.Code == code);
    }

    public Task<Coupon?> Find(string code)
    {
        return db.Coupons.FirstOrDefaultAsync(coupon => coupon.Code == code);
    }

    public Task<int> CountUsage(string code)
    {
        return db.Orders.CountAsync(order => order.CouponCode == code && order.Status != OrderStatuses.Cancelled);
    }

    public async Task Add(Coupon coupon)
    {
        db.Coupons.Add(coupon);
        await db.SaveChangesAsync();
    }

    public async Task Save()
    {
        await db.SaveChangesAsync();
    }
}
