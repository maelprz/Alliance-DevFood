using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public record RegisterRequest(string? Name, string? Email, string? Password);
public record LoginRequest(string? Email, string? Password, bool? RememberMe);
public record ForgotPasswordRequest(string? Email);
public record ResetPasswordRequest(string? Token, string? NewPassword);

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    TokenService tokens,
    EmailSender mailer,
    IConfiguration config,
    IWebHostEnvironment env,
    ILogger<AuthController> log) : ControllerBase
{
    static readonly TimeSpan ResetLinkLifetime = TimeSpan.FromMinutes(30);
    static readonly TimeSpan ResetRequestCooldown = TimeSpan.FromMinutes(1);

    static string Sha256(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        var name = req.Name?.Trim() ?? "";
        var email = req.Email?.Trim().ToLowerInvariant() ?? "";
        if (name == "" || email == "" || string.IsNullOrEmpty(req.Password))
            return BadRequest(new { message = "Name, email and password are required." });
        if (!email.Contains('@'))
            return BadRequest(new { message = "Enter a valid email address." });
        if (req.Password.Length < 8)
            return BadRequest(new { message = "Password must be at least 8 characters." });
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { message = "An account with this email already exists." });

        var user = new User
        {
            FullName = name,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password)
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        return StatusCode(201, new
        {
            message = "Account created successfully. Please log in.",
            user = UsersController.ToDto(user)
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var email = req.Email?.Trim().ToLowerInvariant() ?? "";
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null || string.IsNullOrEmpty(req.Password)
            || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });
        // Checked after the password so the account's status isn't revealed to guessers.
        if (!user.IsActive)
            return StatusCode(403, new { message = "This account has been deactivated. Please contact the admin." });

        var (token, expiresAt) = tokens.Issue(user, req.RememberMe == true);
        return Ok(new { message = "Login successful.", token, expiresAt, user = UsersController.ToDto(user) });
    }

    // Revokes the current token so it can't be reused even before it expires.
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var jti = User.FindFirst("jti")?.Value;
        if (jti is not null && long.TryParse(User.FindFirst("exp")?.Value, out var exp))
        {
            var now = DateTime.UtcNow;
            await db.RevokedTokens.Where(r => r.ExpiresAt < now).ExecuteDeleteAsync();
            db.RevokedTokens.Add(new RevokedToken
            {
                Jti = jti,
                ExpiresAt = DateTimeOffset.FromUnixTimeSeconds(exp).UtcDateTime
            });
            await db.SaveChangesAsync();
        }
        return Ok(new { message = "Logged out." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await db.Users.FindAsync(User.UserId());
        return user is null ? NotFound(new { message = "User not found." }) : Ok(UsersController.ToDto(user));
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest req)
    {
        // Same answer whether or not the email exists, so this can't be used to probe for accounts.
        const string generic = "If an account exists for that email, a password reset link has been sent.";
        var address = req.Email?.Trim().ToLowerInvariant() ?? "";
        if (address == "") return BadRequest(new { message = "Email is required." });

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == address && u.IsActive);
        if (user is null) return Ok(new { message = generic });

        var now = DateTime.UtcNow;
        if (await db.PasswordResetTokens.AnyAsync(t => t.UserId == user.Id && t.CreatedAt > now - ResetRequestCooldown))
            return Ok(new { message = generic });

        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = Sha256(rawToken),
            ExpiresAt = now + ResetLinkLifetime
        });
        await db.SaveChangesAsync();

        var frontendUrl = (config["App:FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');
        var link = $"{frontendUrl}/?reset_token={rawToken}";

        if (!mailer.IsConfigured)
        {
            log.LogWarning("Smtp:Host is not set, so no email was sent. Password reset link for {Email}: {Link}", address, link);
            // Local development only: hand the link back so the flow can be tested without SMTP.
            return env.IsDevelopment()
                ? Ok(new { message = generic, devResetLink = link })
                : Ok(new { message = generic });
        }

        try
        {
            await mailer.SendAsync(address, "Reset your DevFood password",
                $"<p>Hi {System.Net.WebUtility.HtmlEncode(user.FullName)},</p>" +
                $"<p>Click the link below to choose a new password. It expires in {ResetLinkLifetime.TotalMinutes:0} minutes.</p>" +
                $"<p><a href=\"{link}\">Reset my password</a></p>" +
                "<p>If you didn't ask for this, you can ignore this email.</p>");
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Failed to send password reset email to {Email}.", address);
            return StatusCode(502, new { message = "We couldn't send the reset email. Please try again later." });
        }
        return Ok(new { message = generic });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Token) || string.IsNullOrEmpty(req.NewPassword))
            return BadRequest(new { message = "Reset token and new password are required." });
        if (req.NewPassword.Length < 8)
            return BadRequest(new { message = "Password must be at least 8 characters." });

        var now = DateTime.UtcNow;
        var hash = Sha256(req.Token.Trim());
        var reset = await db.PasswordResetTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (reset is null || reset.UsedAt is not null || reset.ExpiresAt < now || !reset.User.IsActive)
            return BadRequest(new { message = "This reset link is invalid or has expired. Please request a new one." });

        reset.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        // Log out every existing session; JWT timestamps have one-second precision.
        reset.User.SessionsValidAfter = now.AddTicks(-(now.Ticks % TimeSpan.TicksPerSecond));
        await db.PasswordResetTokens
            .Where(t => t.UserId == reset.UserId && t.UsedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.UsedAt, now));
        await db.SaveChangesAsync();

        return Ok(new { message = "Your password has been reset. You can now log in." });
    }
}
