// rbac: user has one role, role has permissions. users.role is FK to roles.name
public class Role
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public List<RolePermission> Permissions { get; set; } = [];
}

public class Permission
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
}

// role <-> permission (many to many)
public class RolePermission
{
    public string RoleName { get; set; } = "";
    public Role Role { get; set; } = null!;
    public string PermissionName { get; set; } = "";
    public Permission Permission { get; set; } = null!;
}
