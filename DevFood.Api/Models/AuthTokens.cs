// logged out tokens, can be removed after ExpiresAt
public class RevokedToken
{
    public string Jti { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
}

// reset link, one use only. only the hash is saved
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
