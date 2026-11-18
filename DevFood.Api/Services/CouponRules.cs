// Coupon rules with no database access, so they are easy to read and test.
public static class CouponRules
{
    public const string Percent = "percent";
    public const string Fixed = "fixed";

    // Philippine time (UTC+8): a coupon valid "until Nov 20" lasts until midnight in Cebu.
    public static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(8));

    // Peso amount taken off the subtotal. Never more than the subtotal itself.
    public static decimal Discount(Coupon c, decimal subtotal)
    {
        decimal raw;
        if (c.DiscountType == Fixed)
        {
            raw = c.FixedAmount;
        }
        else
        {
            raw = subtotal * c.DiscountPercent / 100m;
            if (c.MaxDiscount is > 0) raw = Math.Min(raw, c.MaxDiscount.Value);
        }
        return Math.Round(Math.Min(raw, subtotal), 2, MidpointRounding.AwayFromZero);
    }

    // The first reason this coupon cannot be used right now, or null when it can.
    public static string? Problem(Coupon c, decimal subtotal, DateOnly today)
    {
        if (c.IsDisabled) return "This coupon is not available.";
        if (c.StartsAt is { } start && today < start)
            return $"This coupon can be used starting {start:MMM d, yyyy}.";
        if (c.ExpiresAt < today) return "This coupon has expired.";
        if (subtotal < c.MinOrder)
            return $"This coupon requires a minimum order of ₱{c.MinOrder:0.00}.";
        return null;
    }

    // Label shown in the admin table.
    public static string Status(Coupon c, int timesUsed, DateOnly today)
    {
        if (c.IsDisabled) return "Disabled";
        if (c.ExpiresAt < today) return "Expired";
        if (c.StartsAt is { } start && today < start) return "Scheduled";
        if (c.UsageLimit is { } limit && timesUsed >= limit) return "Used up";
        return "Active";
    }
}
