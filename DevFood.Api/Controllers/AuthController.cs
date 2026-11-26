using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService service) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var result = await service.Register(request);
        return StatusCode(result.StatusCode, result.Value);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await service.Login(request);
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var result = await service.Logout(User.FindFirstValue(ClaimNames.TokenId), User.FindFirstValue(ClaimNames.Expires));
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var result = await service.Me(User.UserId(), User.GetPermissions());
        return StatusCode(result.StatusCode, result.Value);
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var result = await service.ForgotPassword(request);
        return StatusCode(result.StatusCode, result.Value);
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var result = await service.ResetPassword(request);
        return StatusCode(result.StatusCode, result.Value);
    }
}
