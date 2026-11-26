using System.Security.Claims;

// current user from token (id + can view other users)
public record CurrentUser(int? Id, bool CanViewOthers)
{
    public bool CanAccess(int userId) => Id == userId || CanViewOthers;

    // same message as the [Authorize] check
    public static ServiceResult Denied() => ServiceResults.StatusCode(403, new { message = AuthMessages.NoPermission });
}

public static class ClaimsExtensions
{
    public static int? UserId(this ClaimsPrincipal principal)
        => int.TryParse(principal.FindFirstValue(ClaimNames.Subject), out var id) ? id : null;

    public static bool IsAdmin(this ClaimsPrincipal principal) => principal.HasClaim(ClaimNames.Role, Roles.Admin);

    public static bool HasPermission(this ClaimsPrincipal principal, string permission)
        => principal.HasClaim(Permissions.ClaimType, permission);

    public static IEnumerable<string> GetPermissions(this ClaimsPrincipal principal)
        => principal.FindAll(Permissions.ClaimType).Select(c => c.Value);

    public static CurrentUser CurrentUser(this ClaimsPrincipal principal)
        => new(principal.UserId(), principal.HasPermission(Permissions.UsersView));
}
