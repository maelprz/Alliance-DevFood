// Role-based access control (RBAC): users have one role; roles grant permissions.
// users.role is a foreign key to roles.name, so only roles that exist here can be assigned.
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

// Which permissions each role grants (many-to-many between roles and permissions).
public class RolePermission
{
    public string RoleName { get; set; } = "";
    public Role Role { get; set; } = null!;
    public string PermissionName { get; set; } = "";
    public Permission Permission { get; set; } = null!;
}
