using System.Text.RegularExpressions;

public class AdminCouponsService(CouponRepository repository)
{
    const int PageSize = 5;
    const string DuplicateCode = "A coupon with this code already exists.";
    static readonly Regex CodePattern = new("^[A-Z0-9_-]{3,20}$");

    static object ToDto(Coupon c, int timesUsed) => new
    {
        code = c.Code,
        description = c.Description,
        discountType = CouponRules.NormalizeDiscountType(c.DiscountType),
        discountPercent = c.DiscountPercent,
        fixedAmount = c.FixedAmount,
        maxDiscount = c.MaxDiscount,
        minOrder = c.MinOrder,
        startsAt = c.StartsAt,
        expiresAt = c.ExpiresAt,
        usageLimit = c.UsageLimit,
        perUserLimit = c.PerUserLimit,
        isDisabled = c.IsDisabled,
        timesUsed,
        status = CouponRules.Status(c, timesUsed, CouponRules.Today())
    };

    public async Task<ServiceResult> GetAll()
    {
        var coupons = await repository.GetAll();
        return ServiceResults.Ok(await WithUsageAsync(coupons));
    }

    public async Task<ServiceResult> GetAdminPage(int page = 1)
    {
        var total = await repository.Count();
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)PageSize));
        var currentPage = Math.Clamp(page, 1, totalPages);
        var coupons = await repository.GetPage((currentPage - 1) * PageSize, PageSize);
        var items = await WithUsageAsync(coupons);

        return ServiceResults.Ok(new { items, total, page = currentPage, totalPages });
    }

    private async Task<object[]> WithUsageAsync(List<Coupon> coupons)
    {
        var used = await repository.GetUsage(coupons.Select(coupon => coupon.Code).ToArray(), OrderStatuses.Cancelled);
        return coupons.Select(coupon => ToDto(coupon, used.GetValueOrDefault(coupon.Code))).ToArray();
    }

    public async Task<ServiceResult> Create(CouponCreate req)
    {
        var code = CouponRules.NormalizeCode(req.Code);
        if (!CodePattern.IsMatch(code))
            return ServiceResults.BadRequest(new { message = "Code must be 3 to 20 letters, numbers, dashes or underscores." });

        var type = (req.DiscountType ?? CouponRules.Percent).Trim().ToLowerInvariant();
        if (type != CouponRules.Percent && type != CouponRules.Fixed)
            return ServiceResults.BadRequest(new { message = "Discount type must be percent or fixed." });

        if (type == CouponRules.Percent)
        {
            if (req.DiscountPercent is null or < 1 or > 100)
                return ServiceResults.BadRequest(new { message = "Discount must be between 1 and 100 percent." });
            if (req.MaxDiscount is <= 0)
                return ServiceResults.BadRequest(new { message = "Maximum discount must be more than zero." });
        }
        else if (req.FixedAmount is null or <= 0)
        {
            return ServiceResults.BadRequest(new { message = "Discount amount must be more than zero." });
        }

        var minOrder = req.MinOrder ?? 0;
        if (minOrder < 0)
            return ServiceResults.BadRequest(new { message = "Minimum order cannot be negative." });
        if (!IsPesoAmount(minOrder) || !IsPesoAmount(req.FixedAmount) || !IsPesoAmount(req.MaxDiscount))
            return ServiceResults.BadRequest(new { message = "Enter peso amounts up to ₱99,999,999.99 with at most two decimal places." });
        if (req.ExpiresAt is null)
            return ServiceResults.BadRequest(new { message = "Expiry date is required." });
        if (req.ExpiresAt < CouponRules.Today())
            return ServiceResults.BadRequest(new { message = "Expiry date cannot be in the past." });
        if (req.StartsAt is { } starts && starts > req.ExpiresAt)
            return ServiceResults.BadRequest(new { message = "Start date must be on or before the expiry date." });
        if (req.UsageLimit is < 1)
            return ServiceResults.BadRequest(new { message = "Usage limit must be at least 1." });
        if (req.PerUserLimit is < 1)
            return ServiceResults.BadRequest(new { message = "Per-customer limit must be at least 1." });
        if (await repository.CodeExists(code))
            return ServiceResults.Conflict(new { message = DuplicateCode });

        var coupon = new Coupon
        {
            Code = code,
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            DiscountType = type,
            DiscountPercent = type == CouponRules.Percent ? req.DiscountPercent!.Value : 0,
            FixedAmount = type == CouponRules.Fixed ? req.FixedAmount!.Value : 0,
            MaxDiscount = type == CouponRules.Percent ? req.MaxDiscount : null,
            MinOrder = minOrder,
            StartsAt = req.StartsAt,
            ExpiresAt = req.ExpiresAt.Value,
            UsageLimit = req.UsageLimit,
            PerUserLimit = req.PerUserLimit
        };
        if (!await repository.TryAdd(coupon))
            return ServiceResults.Conflict(new { message = DuplicateCode });
        return ServiceResults.StatusCode(201, ToDto(coupon, 0));
    }

    static bool IsPesoAmount(decimal? amount) =>
        amount is null || (amount <= 99_999_999.99m && decimal.Round(amount.Value, 2) == amount);

    // Pause or resume a coupon without deleting it.

    public async Task<ServiceResult> SetDisabled(string code, CouponToggle req)
    {
        if (req.IsDisabled is null) return ServiceResults.BadRequest(new { message = "isDisabled is required." });
        var normalized = CouponRules.NormalizeCode(code);
        var coupon = await repository.Find(normalized);
        if (coupon is null) return ServiceResults.NotFound(new { message = "Coupon not found." });
        coupon.IsDisabled = req.IsDisabled.Value;
        await repository.Save();
        var used = await repository.CountUsage(coupon.Code, OrderStatuses.Cancelled);
        return ServiceResults.Ok(ToDto(coupon, used));
    }

    public async Task<ServiceResult> Delete(string code)
    {
        var normalized = CouponRules.NormalizeCode(code);
        var coupon = await repository.Find(normalized);
        if (coupon is null) return ServiceResults.NotFound(new { message = "Coupon not found." });
        coupon.IsDeleted = true;
        await repository.Save();
        return ServiceResults.Ok(new { message = "Coupon deleted." });
    }
}
