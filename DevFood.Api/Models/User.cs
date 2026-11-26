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
    // false = deactivated, can't login
    public bool IsActive { get; set; } = true;
    public DateTime? DeactivatedAt { get; set; }
    // tokens before this are invalid (set on pw reset)
    public DateTime? SessionsValidAfter { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
