// default roles and permissions (HasData)
public static class RbacSeed
{
    public static readonly Role[] Roles =
    [
        new() { Name = global::Roles.Customer, Description = "Registered customer who orders food" },
        new() { Name = global::Roles.Admin, Description = "Staff member who manages the system" },
    ];

    public static readonly Permission[] Permissions =
    [
        new() { Name = global::Permissions.AdminPanel, Description = "Open the admin panel" },
        new() { Name = global::Permissions.UsersView, Description = "List and search registered users" },
        new() { Name = global::Permissions.UsersDeactivate, Description = "Deactivate or reactivate customer accounts" },
        new() { Name = global::Permissions.ProfileManageOwn, Description = "View and edit own profile and password" },
        new() { Name = global::Permissions.NotificationsReadOwn, Description = "Read and mark own notifications" },
    ];

    public static readonly RolePermission[] RolePermissions =
    [
        Grant(global::Roles.Customer, global::Permissions.ProfileManageOwn),
        Grant(global::Roles.Customer, global::Permissions.NotificationsReadOwn),
        Grant(global::Roles.Admin, global::Permissions.AdminPanel),
        Grant(global::Roles.Admin, global::Permissions.UsersView),
        Grant(global::Roles.Admin, global::Permissions.UsersDeactivate),
        Grant(global::Roles.Admin, global::Permissions.ProfileManageOwn),
        Grant(global::Roles.Admin, global::Permissions.NotificationsReadOwn),
    ];

    static RolePermission Grant(string role, string permission) => new() { RoleName = role, PermissionName = permission };
}
