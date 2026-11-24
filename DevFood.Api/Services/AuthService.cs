using System.Security.Cryptography;
using System.Text;

public class AuthService(
    UserRepository users,
    AuthTokenRepository authTokens,
    TokenService tokens,
    EmailSender mailer,
    NotificationService notifications,
    IConfiguration config,
    IWebHostEnvironment env,
    ILogger<AuthService> log)
{
    static string Sha256(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    static string NormalizeEmail(string? email) => email?.Trim().ToLowerInvariant() ?? "";

    public async Task<ServiceResult> Register(RegisterRequest req)
    {
        var name = req.Name?.Trim() ?? "";
        var email = NormalizeEmail(req.Email);
        if (name == "" || email == "" || string.IsNullOrEmpty(req.Password))
            return ServiceResults.BadRequest(new { message = "Name, email and password are required." });
        if (!email.Contains('@'))
            return ServiceResults.BadRequest(new { message = AuthMessages.InvalidEmail });
        if (req.Password.Length < AuthRules.PasswordMinLength)
            return ServiceResults.BadRequest(new { message = $"Password must be at least {AuthRules.PasswordMinLength} characters." });
        if (await users.EmailInUse(email))
            return ServiceResults.Conflict(new { message = "An account with this email already exists." });

        // Sign up always creates a customer; admins are set in the database.
        var user = new User
        {
            FullName = name,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = Roles.Customer
        };
        await users.Add(user);

        // A failed welcome message must not undo a finished sign-up.
        try
        {
            await notifications.WelcomeNewUser(user.Id);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Could not add the new-user notifications for user {UserId}.", user.Id);
        }

        return ServiceResults.StatusCode(201, new
        {
            message = "Account created successfully. Please log in.",
            user = UserService.ToDto(user)
        });
    }

    public async Task<ServiceResult> Login(LoginRequest req)
    {
        var user = await users.FindByEmail(NormalizeEmail(req.Email));
        if (user is null || string.IsNullOrEmpty(req.Password)
            || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return ServiceResults.StatusCode(401, new { message = AuthMessages.InvalidLogin });
        if (!user.IsActive)
            return ServiceResults.StatusCode(403, new { message = "This account has been deactivated. Please contact the admin." });

        // "Remember me" is for customers only; admin sessions always last 8 hours.
        var rememberMe = req.RememberMe == true && user.Role != Roles.Admin;
        var (token, expiresAt) = tokens.Issue(user, rememberMe);
        var permissions = await users.PermissionsForRole(user.Role);
        return ServiceResults.Ok(new
        {
            message = "Login successful.",
            token,
            expiresAt,
            user = UserService.ToSessionDto(user, permissions)
        });
    }

    // Saves the token id until it expires, so the same token is refused from now on.
    public async Task<ServiceResult> Logout(string? jti, string? exp)
    {
        if (jti is not null && long.TryParse(exp, out var expSeconds))
        {
            var expiresAt = DateTimeOffset.FromUnixTimeSeconds(expSeconds).UtcDateTime;
            await authTokens.AddRevoked(new RevokedToken
            {
                Jti = jti,
                ExpiresAt = expiresAt
            });
        }
        return ServiceResults.Ok(new { message = "Logged out." });
    }

    public async Task<ServiceResult> Me(int? userId, IEnumerable<string> permissions)
    {
        var user = userId is null ? null : await users.Find(userId.Value);
        if (user is null) return ServiceResults.NotFound(new { message = AuthMessages.UserNotFound });
        return ServiceResults.Ok(UserService.ToSessionDto(user, permissions.Order()));
    }

    // Runs on every request with a token (see Program.cs). Returns null when the
    // session must be refused: user gone or deactivated, logged out, or the token
    // was issued before the last password reset.
    public async Task<SessionState?> CheckSession(int? userId, string? jti, DateTime issuedAt)
    {
        var state = await users.GetSessionState(userId, jti);
        if (state is null || !state.IsActive || state.Revoked) return null;
        if (state.SessionsValidAfter is { } after && issuedAt < after) return null;
        return state;
    }

    // Always answers with the same message so nobody can check which emails are registered.
    public async Task<ServiceResult> ForgotPassword(ForgotPasswordRequest req)
    {
        var address = NormalizeEmail(req.Email);
        if (address == "") return ServiceResults.BadRequest(new { message = "Email is required." });

        var user = await users.FindActiveByEmail(address);
        if (user is null) return ServiceResults.Ok(new { message = AuthMessages.ResetLinkSent });

        var now = DateTime.UtcNow;
        if (await authTokens.HasResetSince(user.Id, now - AuthRules.ResetRequestCooldown))
            return ServiceResults.Ok(new { message = AuthMessages.ResetLinkSent });

        // Only the hash is stored; the raw token exists only in the emailed link.
        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        await authTokens.AddReset(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = Sha256(rawToken),
            ExpiresAt = now + AuthRules.ResetLinkLifetime
        });

        var frontendUrl = (config[ConfigKeys.FrontendUrl] ?? AuthRules.DefaultFrontendUrl).TrimEnd('/');
        var link = $"{frontendUrl}{AuthRules.ResetPasswordPath}?{AuthRules.ResetTokenParam}={rawToken}";

        if (!mailer.IsConfigured)
        {
            log.LogWarning("{Key} is not set, so no email was sent. Password reset link for {Email}: {Link}",
                ConfigKeys.SmtpHost, address, link);
            return env.IsDevelopment()
                ? ServiceResults.Ok(new { message = AuthMessages.ResetLinkSent, devResetLink = link })
                : ServiceResults.Ok(new { message = AuthMessages.ResetLinkSent });
        }

        try
        {
            await mailer.SendAsync(address, "Reset your DevFood password",
                $"<p>Hi {System.Net.WebUtility.HtmlEncode(user.FullName)},</p>" +
                $"<p>Click the link below to choose a new password. It expires in {AuthRules.ResetLinkLifetime.TotalMinutes:0} minutes.</p>" +
                $"<p><a href=\"{link}\">Reset my password</a></p>" +
                "<p>If you didn't ask for this, you can ignore this email.</p>");
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Failed to send password reset email to {Email}.", address);
            return ServiceResults.StatusCode(502, new { message = "We couldn't send the reset email. Please try again later." });
        }
        return ServiceResults.Ok(new { message = AuthMessages.ResetLinkSent });
    }

    public async Task<ServiceResult> ResetPassword(ResetPasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Token) || string.IsNullOrEmpty(req.NewPassword))
            return ServiceResults.BadRequest(new { message = "Reset token and new password are required." });
        if (req.NewPassword.Length < AuthRules.PasswordMinLength)
            return ServiceResults.BadRequest(new { message = $"Password must be at least {AuthRules.PasswordMinLength} characters." });

        var now = DateTime.UtcNow;
        var reset = await authTokens.FindReset(Sha256(req.Token.Trim()));
        if (reset is null || reset.UsedAt is not null || reset.ExpiresAt < now || !reset.User.IsActive)
            return ServiceResults.BadRequest(new { message = "This reset link is invalid or has expired. Please request a new one." });

        reset.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        // Tokens issued before this second stop working (logs out other devices).
        reset.User.SessionsValidAfter = now.AddTicks(-(now.Ticks % TimeSpan.TicksPerSecond));
        await authTokens.MarkResetsUsed(reset.UserId, now);
        await authTokens.Save();

        return ServiceResults.Ok(new { message = "Your password has been reset. You can now log in." });
    }
}
