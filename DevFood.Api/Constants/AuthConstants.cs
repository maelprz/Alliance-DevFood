// Fixed values for login, users and notifications, kept in one place.

public static class ClaimNames
{
    public const string Subject = "sub";
    public const string Role = "role";
    public const string Name = "name";
    public const string TokenId = "jti";
    public const string Expires = "exp";
}

public static class ConfigKeys
{
    public const string JwtKey = "Jwt:Key";
    public const string FrontendUrl = "App:FrontendUrl";
    public const string AdminEmail = "Admin:Email";
    public const string AdminPassword = "Admin:Password";
    public const string SmtpHost = "Smtp:Host";
    public const string SmtpPort = "Smtp:Port";
    public const string SmtpUsername = "Smtp:Username";
    public const string SmtpPassword = "Smtp:Password";
    public const string SmtpFrom = "Smtp:From";
}

public static class AuthRules
{
    public const int PasswordMinLength = 8;
    public const int DefaultPageSize = 10;
    public const int MaxPageSize = 100;
    public const int DefaultSmtpPort = 587;
    public const string DefaultFrontendUrl = "http://localhost:5173";
    public const string DefaultSender = "no-reply@devfood.local";
    public const string ResetPasswordPath = "/reset-password";
    public const string ResetTokenParam = "reset_token";

    public static readonly TimeSpan SessionLifetime = TimeSpan.FromHours(8);
    public static readonly TimeSpan ResetLinkLifetime = TimeSpan.FromMinutes(30);
    public static readonly TimeSpan ResetRequestCooldown = TimeSpan.FromMinutes(1);
    public static readonly TimeSpan NameChangeCooldown = TimeSpan.FromDays(30);
}

// Columns the admin can sort the Users list by: GET /api/users?sort=name&dir=desc
public enum UserSortField { Joined, Name, Email, Role, Status }

public static class UserSortKeys
{
    public const string Joined = "joined";
    public const string Name = "name";
    public const string Email = "email";
    public const string Role = "role";
    public const string Status = "status";
    public const string Descending = "desc";
}

public static class AuthMessages
{
    public const string NoPermission = "You don't have permission to do that.";
    public const string SessionExpired = "Your session has expired. Please log in again.";
    public const string InvalidLogin = "Invalid email or password.";
    public const string InvalidEmail = "Enter a valid email address.";
    public const string UserNotFound = "User not found.";
    public const string NotificationNotFound = "Notification not found.";
    public const string ResetLinkSent = "If an account exists for that email, a password reset link has been sent.";
}

public static class ResponseHeaders
{
    public const string TotalCount = "X-Total-Count";
}
