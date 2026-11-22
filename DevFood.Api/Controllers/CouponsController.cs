using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

[ApiController]
[Route("api/coupons")]
[Authorize(Roles = Roles.Admin)]
public class CouponsController(AdminCouponsService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await service.GetAll();
        return StatusCode(result.StatusCode, result.Value);
    }

    [HttpGet("admin-page")]
    public async Task<IActionResult> GetAdminPage([FromQuery] int page = 1)
    {
        var result = await service.GetAdminPage(page);
        return StatusCode(result.StatusCode, result.Value);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CouponCreate request)
    {
        var result = await service.Create(request);
        return StatusCode(result.StatusCode, result.Value);
    }

    [HttpPatch("{code}")]
    public async Task<IActionResult> SetDisabled(string code, CouponToggle request)
    {
        var result = await service.SetDisabled(code, request);
        return StatusCode(result.StatusCode, result.Value);
    }

    [HttpDelete("{code}")]
    public async Task<IActionResult> Delete(string code)
    {
        var result = await service.Delete(code);
        return StatusCode(result.StatusCode, result.Value);
    }
}
