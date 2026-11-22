using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/cart")]
[Authorize]
public class CartController(CartService cart, CouponService coupons) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var result = await cart.GetAsync(User.UserId());
        return StatusCode(result.StatusCode, result.Value);
    }

    [HttpPut]
    public async Task<IActionResult> Put(CartPut request)
    {
        var result = await cart.SaveAsync(User.UserId(), request);
        return StatusCode(result.StatusCode, result.Value);
    }

    [HttpPost("apply-coupon")]
    public async Task<IActionResult> ApplyCoupon(ApplyCouponRequest request)
    {
        var result = await coupons.PreviewAsync(User.UserId(), request);
        return StatusCode(result.StatusCode, result.Value);
    }
}
