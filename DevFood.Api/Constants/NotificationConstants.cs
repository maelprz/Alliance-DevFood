// Announcements the admin sends to every customer. Order notification types
// (order_confirmed, order_status) are in OrderConstants.cs.

public static class BroadcastTypes
{
    public const string General = "broadcast";
    public const string Coupon = "coupon";
}

public static class BroadcastAudiences
{
    // Sent once to every customer who already has an account.
    public const string All = "all";

    // Kept by the server and given to each customer when they sign up.
    public const string NewUsers = "new_users";
}

public static class NotificationRules
{
    // The bell only lists notifications from this recent window. Older rows stay in the database.
    public static readonly TimeSpan BellWindow = TimeSpan.FromDays(7);

    // "See previous notifications" loads older ones this many at a time.
    public const int OlderPageSize = 10;

    // After this, a notification is soft-deleted (IsDeleted = true) and never shown again.
    // The row stays in the database; nothing is permanently deleted.
    public static readonly TimeSpan KeepFor = TimeSpan.FromDays(30);

    // How often the background job looks for notifications past KeepFor.
    public static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(1);
}
