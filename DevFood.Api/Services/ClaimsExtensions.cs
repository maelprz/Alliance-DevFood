using System.Security.Claims;

public static class ClaimsExtensions
{
    public static int? UserId(this ClaimsPrincipal principal)
        => int.TryParse(principal.FindFirstValue("sub"), out var id) ? id : null;

    public static bool IsAdmin(this ClaimsPrincipal principal) => principal.HasClaim("role", Roles.Admin);

    // Permissions are added from the database when the token is validated (see Program.cs).
    public static bool HasPermission(this ClaimsPrincipal principal, string permission)
        => principal.HasClaim(Permissions.ClaimType, permission);

    // Users may always reach their own records; reaching someone else's needs users.view.
    public static bool CanAccessUser(this ClaimsPrincipal principal, int userId)
        => principal.UserId() == userId || principal.HasPermission(Permissions.UsersView);
}
