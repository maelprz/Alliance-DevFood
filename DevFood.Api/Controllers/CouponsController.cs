using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public record CouponCreate(string? Code, int? DiscountPercent, decimal? MinOrder, DateOnly? ExpiresAt);

[ApiController]
[Route("api/coupons")]
public class CouponsController(AppDbContext db) : ControllerBase
{
    static object ToDto(Coupon c) => new
    {
        code = c.Code,
        discountPercent = c.DiscountPercent,
        minOrder = c.MinOrder,
        expiresAt = c.ExpiresAt
    };

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok((await db.Coupons.OrderBy(c => c.ExpiresAt).ToListAsync()).Select(ToDto));

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<IActionResult> Create(CouponCreate req)
    {
        var code = req.Code?.Trim().ToUpperInvariant() ?? "";
        if (code == "" || req.DiscountPercent is null || req.MinOrder is null || req.ExpiresAt is null)
            return BadRequest(new { message = "Code, discount, minimum order and expiry date are required." });
        if (req.DiscountPercent is < 1 or > 100)
            return BadRequest(new { message = "Discount must be between 1 and 100 percent." });
        if (req.MinOrder < 0)
            return BadRequest(new { message = "Minimum order cannot be negative." });
        if (await db.Coupons.IgnoreQueryFilters().AnyAsync(c => c.Code == code))
            return Conflict(new { message = "A coupon with this code already exists." });

        var coupon = new Coupon
        {
            Code = code,
            DiscountPercent = req.DiscountPercent.Value,
            MinOrder = req.MinOrder.Value,
            ExpiresAt = req.ExpiresAt.Value
        };
        db.Coupons.Add(coupon);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(coupon));
    }

    [Authorize(Roles = "admin")]
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
