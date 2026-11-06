public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "customer";
    public string? Phone { get; set; }
    public string? AddressStreet { get; set; }
    public string? AddressCity { get; set; }
    public string? AddressZip { get; set; }
    public DateTime? NameChangedAt { get; set; }
    // Soft delete: deactivated users can't log in and their tokens stop working.
    public bool IsActive { get; set; } = true;
    public DateTime? DeactivatedAt { get; set; }
    // Tokens issued before this moment are rejected (set on password reset).
    public DateTime? SessionsValidAfter { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
