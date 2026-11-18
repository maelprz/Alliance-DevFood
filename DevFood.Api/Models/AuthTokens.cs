// A JWT that was logged out before it expired. Rows can be purged once ExpiresAt passes.
public class RevokedToken
{
    public string Jti { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
}

// Single-use password reset link. Only the SHA-256 hash of the emailed token is stored.
public class PasswordResetToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string TokenHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
