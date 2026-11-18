using Microsoft.EntityFrameworkCore;

public record CouponResult(Coupon? Coupon, decimal Discount, string Error);

public static class CouponService
{
    // Orders that count against the usage limits. A cancelled order frees the coupon again.
    public static IQueryable<Order> Redemptions(AppDbContext db, string code)
        => db.Orders.Where(o => o.CouponCode == code && o.Status != "Cancelled");

    // Checks a coupon for one customer and one subtotal. Used by "Apply Coupon" in the
    // cart and again when the order is placed, so both always give the same answer.
    public static async Task<CouponResult> Evaluate(
        AppDbContext db, string code, decimal subtotal, int userId, bool lockForOrder = false)
    {
        var normalized = code.Trim().ToUpperInvariant();
        var coupons = db.Coupons.AsNoTracking();
        Coupon? coupon;
        if (lockForOrder)
        {
            // Hold the coupon row until the order commits. The next checkout sees
            // that redemption before it checks the limits.
            var locked = await db.Database.SqlQuery<int>(
                $"SELECT id FROM coupons WHERE code = {normalized} AND NOT is_deleted FOR UPDATE")
                .ToListAsync();
            coupon = locked.Count == 0 ? null : await coupons.FirstOrDefaultAsync(c => c.Id == locked[0]);
        }
        else
        {
            coupon = await coupons.FirstOrDefaultAsync(c => c.Code == normalized);
        }
        if (coupon is null) return new(null, 0, "Invalid coupon code.");

        var problem = CouponRules.Problem(coupon, subtotal, CouponRules.Today());
        if (problem is not null) return new(null, 0, problem);

        var redemptions = Redemptions(db, coupon.Code);
        if (coupon.UsageLimit is { } limit && await redemptions.CountAsync() >= limit)
            return new(null, 0, "This coupon has been fully redeemed.");
        if (coupon.PerUserLimit is { } perUser
            && await redemptions.CountAsync(o => o.UserId == userId) >= perUser)
            return new(null, 0, "You have already used this coupon.");

        var discount = CouponRules.Discount(coupon, subtotal);
        if (discount <= 0) return new(null, 0, "This coupon gives no discount on this order.");
        return new(coupon, discount, "");
    }
}
