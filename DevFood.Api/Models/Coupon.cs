public class Coupon
{
    public int Id { get; set; }
    public bool IsDeleted { get; set; }
    public string Code { get; set; } = "";
    public string? Description { get; set; }

    // "percent" uses DiscountPercent (and the optional MaxDiscount cap).
    // "fixed" takes FixedAmount (pesos) off the order.
    public string DiscountType { get; set; } = "percent";
    public int DiscountPercent { get; set; }
    public decimal FixedAmount { get; set; }
    public decimal? MaxDiscount { get; set; }

    public decimal MinOrder { get; set; }

    // Duration: valid from StartsAt (blank = right away) until the end of ExpiresAt.
    public DateOnly? StartsAt { get; set; }
    public DateOnly ExpiresAt { get; set; }

    // Blank (null) = unlimited.
    public int? UsageLimit { get; set; }
    public int? PerUserLimit { get; set; }

    // Lets an admin pause a coupon without deleting it.
    public bool IsDisabled { get; set; }
}
