using Microsoft.EntityFrameworkCore;
using Npgsql;

public class CouponRepository(AppDbContext db)
{
    public Task<Dictionary<string, int>> GetUsage(string[] codes, string excludedStatus)
    {
        return db.Orders
            .Where(order => order.CouponCode != null && codes.Contains(order.CouponCode) && order.Status != excludedStatus)
            .GroupBy(order => order.CouponCode!)
            .Select(group => new { Code = group.Key, Count = group.Count() })
            .ToDictionaryAsync(group => group.Code, group => group.Count);
    }

    public Task<List<Coupon>> GetAll()
    {
        return db.Coupons.AsNoTracking().OrderByDescending(coupon => coupon.ExpiresAt).ThenBy(coupon => coupon.Code).ToListAsync();
    }

    public Task<int> Count()
    {
        return db.Coupons.CountAsync();
    }

    public Task<List<Coupon>> GetPage(int offset, int limit)
    {
        return db.Coupons.AsNoTracking().OrderByDescending(coupon => coupon.Id).Skip(offset).Take(limit).ToListAsync();
    }

    public Task<bool> CodeExists(string code)
    {
        return db.Coupons.IgnoreQueryFilters().AnyAsync(coupon => coupon.Code == code);
    }

    public Task<Coupon?> Find(string code)
    {
        return db.Coupons.FirstOrDefaultAsync(coupon => coupon.Code == code);
    }

    public async Task<bool> LockAsync(string code)
    {
        var rows = await db.Database.SqlQuery<int>(
            $"SELECT id FROM coupons WHERE code = {code} AND NOT is_deleted FOR UPDATE").ToListAsync();
        return rows.Count != 0;
    }

    public Task<int> CountUsage(string code, string excludedStatus, int? userId = null)
        => db.Orders.CountAsync(order => order.CouponCode == code && order.Status != excludedStatus
            && (userId == null || order.UserId == userId));

    public async Task<bool> TryAdd(Coupon coupon)
    {
        db.Coupons.Add(coupon);
        try
        {
            await db.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            db.Entry(coupon).State = EntityState.Detached;
            return false;
        }
    }

    public async Task Save()
    {
        await db.SaveChangesAsync();
    }
}
