using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

public record CouponCreate(
    string? Code,
    string? Description,
    string? DiscountType,
    int? DiscountPercent,
    decimal? FixedAmount,
    decimal? MaxDiscount,
    decimal? MinOrder,
    DateOnly? StartsAt,
    DateOnly? ExpiresAt,
    int? UsageLimit,
    int? PerUserLimit);

public record CouponToggle(bool? IsDisabled);

// Admin only. Customers never list coupons, they receive codes through notifications
// and type them in at the cart.
[ApiController]
[Route("api/coupons")]
[Authorize(Roles = "admin")]
public class CouponsController(AppDbContext db) : ControllerBase
{
    static readonly Regex CodePattern = new("^[A-Z0-9_-]{3,20}$");

    static object ToDto(Coupon c, int timesUsed) => new
    {
        code = c.Code,
        description = c.Description,
        discountType = c.DiscountType == CouponRules.Fixed ? CouponRules.Fixed : CouponRules.Percent,
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

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var used = await db.Orders
            .Where(o => o.CouponCode != null && o.Status != "Cancelled")
            .GroupBy(o => o.CouponCode!)
            .Select(g => new { Code = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Code, x => x.Count);
        var coupons = await db.Coupons.OrderByDescending(c => c.ExpiresAt).ThenBy(c => c.Code).ToListAsync();
        return Ok(coupons.Select(c => ToDto(c, used.GetValueOrDefault(c.Code))));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CouponCreate req)
    {
        var code = req.Code?.Trim().ToUpperInvariant() ?? "";
        if (!CodePattern.IsMatch(code))
            return BadRequest(new { message = "Code must be 3 to 20 letters, numbers, dashes or underscores." });

        var type = (req.DiscountType ?? CouponRules.Percent).Trim().ToLowerInvariant();
        if (type != CouponRules.Percent && type != CouponRules.Fixed)
            return BadRequest(new { message = "Discount type must be percent or fixed." });

        if (type == CouponRules.Percent)
        {
            if (req.DiscountPercent is null or < 1 or > 100)
                return BadRequest(new { message = "Discount must be between 1 and 100 percent." });
            if (req.MaxDiscount is <= 0)
                return BadRequest(new { message = "Maximum discount must be more than zero." });
        }
        else if (req.FixedAmount is null or <= 0)
        {
            return BadRequest(new { message = "Discount amount must be more than zero." });
        }

        var minOrder = req.MinOrder ?? 0;
        if (minOrder < 0)
            return BadRequest(new { message = "Minimum order cannot be negative." });
        if (!IsPesoAmount(minOrder) || !IsPesoAmount(req.FixedAmount) || !IsPesoAmount(req.MaxDiscount))
            return BadRequest(new { message = "Enter peso amounts up to ₱99,999,999.99 with at most two decimal places." });
        if (req.ExpiresAt is null)
            return BadRequest(new { message = "Expiry date is required." });
        if (req.ExpiresAt < CouponRules.Today())
            return BadRequest(new { message = "Expiry date cannot be in the past." });
        if (req.StartsAt is { } starts && starts > req.ExpiresAt)
            return BadRequest(new { message = "Start date must be on or before the expiry date." });
        if (req.UsageLimit is < 1)
            return BadRequest(new { message = "Usage limit must be at least 1." });
        if (req.PerUserLimit is < 1)
            return BadRequest(new { message = "Per-customer limit must be at least 1." });
        if (await db.Coupons.IgnoreQueryFilters().AnyAsync(c => c.Code == code))
            return Conflict(new { message = "A coupon with this code already exists." });

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
        db.Coupons.Add(coupon);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Conflict(new { message = "A coupon with this code already exists." });
        }
        return StatusCode(201, ToDto(coupon, 0));
    }

    static bool IsPesoAmount(decimal? amount) =>
        amount is null || (amount <= 99_999_999.99m && decimal.Round(amount.Value, 2) == amount);

    // Pause or resume a coupon without deleting it.
    [HttpPatch("{code}")]
    public async Task<IActionResult> SetDisabled(string code, CouponToggle req)
    {
        if (req.IsDisabled is null) return BadRequest(new { message = "isDisabled is required." });
        var normalized = code.Trim().ToUpperInvariant();
        var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == normalized);
        if (coupon is null) return NotFound(new { message = "Coupon not found." });
        coupon.IsDisabled = req.IsDisabled.Value;
        await db.SaveChangesAsync();
        var used = await CouponService.Redemptions(db, coupon.Code).CountAsync();
        return Ok(ToDto(coupon, used));
    }

    [HttpDelete("{code}")]
    public async Task<IActionResult> Delete(string code)
    {
        var normalized = code.Trim().ToUpperInvariant();
        var coupon = await db.Coupons.FirstOrDefaultAsync(c => c.Code == normalized);
        if (coupon is null) return NotFound(new { message = "Coupon not found." });
        coupon.IsDeleted = true;
        await db.SaveChangesAsync();
        return Ok(new { message = "Coupon deleted." });
    }
}
