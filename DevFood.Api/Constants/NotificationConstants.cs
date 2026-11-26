// announcement audiences (order notif types are in OrderConstants)

public static class BroadcastTypes
{
    public const string General = "broadcast";
    public const string Coupon = "coupon";
}

public static class BroadcastAudiences
{
    // send now to all existing customers
    public const string All = "all";

    // saved, given to each new signup
    public const string NewUsers = "new_users";
}

public static class NotificationRules
{
    // how far back the bell shows
    public static readonly TimeSpan BellWindow = TimeSpan.FromDays(7);

    // page size for older notifs
    public const int OlderPageSize = 10;

    // soft delete after this (row stays in db)
    public static readonly TimeSpan KeepFor = TimeSpan.FromDays(30);

    // how often the cleanup job runs
    public static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(1);
}
