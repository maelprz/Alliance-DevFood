public static class Roles
{
    public const string Customer = "customer";
    public const string Admin = "admin";
}

public static class Permissions
{
    public const string ClaimType = "perm";

    public const string AdminPanel = "admin.panel";
    public const string UsersView = "users.view";
    public const string UsersDeactivate = "users.deactivate";
    public const string ProfileManageOwn = "profile.manage_own";
    public const string NotificationsReadOwn = "notifications.read_own";

    public static readonly string[] All = [AdminPanel, UsersView, UsersDeactivate, ProfileManageOwn, NotificationsReadOwn];
}
