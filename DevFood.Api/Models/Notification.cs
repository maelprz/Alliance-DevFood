public class Notification
{
    public int Id { get; set; }
    public bool IsDeleted { get; set; }
    // null = broadcast to every customer
    public int? UserId { get; set; }
    public User? User { get; set; }
    public string Type { get; set; } = "broadcast";
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
    public string Audience { get; set; } = "all";
    public string? CouponCode { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// One row per (notification, user) that has been read; works for broadcasts too.
public class NotificationRead
{
    public int NotificationId { get; set; }
    public Notification Notification { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
