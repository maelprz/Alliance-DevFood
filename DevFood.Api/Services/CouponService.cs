public record CouponResult(Coupon? Coupon, decimal Discount, string? Error);

public class CouponService(CouponRepository repository)
{
    const string InvalidCode = "Invalid coupon code.";
    public async Task<ServiceResult> PreviewAsync(int? userId, ApplyCouponRequest request)
    {
        if (userId is null) return ServiceResults.Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Code))
            return ServiceResults.BadRequest(new { valid = false, message = "Enter a coupon code." });

        var result = await EvaluateAsync(request.Code, request.Subtotal ?? 0, userId.Value);
        if (result.Coupon is not { } coupon)
            return ServiceResults.BadRequest(new { valid = false, message = result.Error });

        return ServiceResults.Ok(new
        {
            valid = true,
            message = $"Coupon applied: you save ₱{result.Discount:0.00}.",
            code = coupon.Code,
            description = coupon.Description,
            discountType = CouponRules.NormalizeDiscountType(coupon.DiscountType),
            discountPercent = coupon.DiscountPercent,
            fixedAmount = coupon.FixedAmount,
            maxDiscount = coupon.MaxDiscount,
            minOrder = coupon.MinOrder,
            discountAmount = result.Discount
        });
    }

    public async Task<CouponResult> EvaluateAsync(string code, decimal subtotal, int userId, bool lockForOrder = false)
    {
        var normalized = CouponRules.NormalizeCode(code);
        // Checkout holds this lock until its order and coupon redemption commit.
        if (lockForOrder && !await repository.LockAsync(normalized))
            return new(null, 0, InvalidCode);

        var coupon = await repository.Find(normalized);
        if (coupon is null) return new(null, 0, InvalidCode);

        var problem = CouponRules.Problem(coupon, subtotal, CouponRules.Today());
        if (problem is not null) return new(null, 0, problem);
        if (coupon.UsageLimit is { } limit && await repository.CountUsage(normalized, OrderStatuses.Cancelled) >= limit)
            return new(null, 0, "This coupon has been fully redeemed.");
        if (coupon.PerUserLimit is { } perUser
            && await repository.CountUsage(normalized, OrderStatuses.Cancelled, userId) >= perUser)
            return new(null, 0, "You have already used this coupon.");

        var discount = CouponRules.Discount(coupon, subtotal);
        if (discount <= 0) return new(null, 0, "This coupon gives no discount on this order.");
        return new(coupon, discount, null);
    }
}
