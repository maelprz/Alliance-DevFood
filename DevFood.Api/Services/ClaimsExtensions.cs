using System.Security.Claims;

public static class ClaimsExtensions
{
    public static int? UserId(this ClaimsPrincipal principal)
        => int.TryParse(principal.FindFirstValue("sub"), out var id) ? id : null;

    public static bool IsAdmin(this ClaimsPrincipal principal) => principal.HasClaim("role", Roles.Admin);

    public static bool HasPermission(this ClaimsPrincipal principal, string permission)
        => principal.HasClaim(Permissions.ClaimType, permission);

    public static bool CanAccessUser(this ClaimsPrincipal principal, int userId)
        => principal.UserId() == userId || principal.HasPermission(Permissions.UsersView);
}
