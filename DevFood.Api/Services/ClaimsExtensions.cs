using System.Security.Claims;

public static class ClaimsExtensions
{
    public static int? UserId(this ClaimsPrincipal principal)
        => int.TryParse(principal.FindFirstValue("sub"), out var id) ? id : null;

    public static bool IsAdmin(this ClaimsPrincipal principal) => principal.HasClaim("role", "admin");

    // Customers may only touch their own records; admins may touch anyone's.
    public static bool CanAccessUser(this ClaimsPrincipal principal, int userId)
        => principal.IsAdmin() || principal.UserId() == userId;
}
