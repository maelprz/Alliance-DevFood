using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

public record UserPage(List<User> Users, int? Total);

public record SessionState(bool IsActive, DateTime? SessionsValidAfter, string Role, bool Revoked, List<string> Permissions);

public class UserRepository(AppDbContext db)
{
    public async Task<User?> Find(int id)
    {
        return await db.Users.FindAsync(id);
    }

    public Task<User?> FindByEmail(string email)
    {
        return db.Users.FirstOrDefaultAsync(u => u.Email == email);
    }

    public Task<User?> FindActiveByEmail(string email)
    {
        return db.Users.FirstOrDefaultAsync(u => u.Email == email && u.IsActive);
    }

    // exceptUserId lets a user keep their own email when editing the profile.
    public Task<bool> EmailInUse(string email, int exceptUserId = 0)
    {
        return db.Users.AnyAsync(u => u.Email == email && u.Id != exceptUserId);
    }

    // page = null returns every match; otherwise one page plus the total count.
    public async Task<UserPage> Search(string? search, UserSortField sort, bool descending, int? page, int pageSize)
    {
        var query = db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(u => EF.Functions.ILike(u.FullName, pattern) || EF.Functions.ILike(u.Email, pattern));
        }
        var sorted = sort switch
        {
            UserSortField.Name => SortBy(query, u => u.FullName, descending),
            UserSortField.Email => SortBy(query, u => u.Email, descending),
            UserSortField.Role => SortBy(query, u => u.Role, descending),
            // Active users first when ascending.
            UserSortField.Status => SortBy(query, u => !u.IsActive, descending),
            _ => SortBy(query, u => u.CreatedAt, descending),
        };
        query = sorted.ThenBy(u => u.Id);

        if (page is null) return new UserPage(await query.ToListAsync(), null);

        var total = await query.CountAsync();
        var users = await query.Skip((page.Value - 1) * pageSize).Take(pageSize).ToListAsync();
        return new UserPage(users, total);
    }

    static IOrderedQueryable<User> SortBy<T>(IQueryable<User> query, Expression<Func<User, T>> key, bool descending)
    {
        return descending ? query.OrderByDescending(key) : query.OrderBy(key);
    }

    public Task<List<string>> PermissionsForRole(string role)
    {
        return db.RolePermissions.AsNoTracking()
            .Where(rp => rp.RoleName == role)
            .OrderBy(rp => rp.PermissionName)
            .Select(rp => rp.PermissionName)
            .ToListAsync();
    }

    // One query per request: account state, logout check and the role's permissions.
    public Task<SessionState?> GetSessionState(int? userId, string? jti)
    {
        return db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new SessionState(
                u.IsActive,
                u.SessionsValidAfter,
                u.Role,
                db.RevokedTokens.Any(r => r.Jti == jti),
                db.RolePermissions.Where(rp => rp.RoleName == u.Role).Select(rp => rp.PermissionName).ToList()))
            .FirstOrDefaultAsync();
    }

    public async Task Add(User user)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    public async Task Save()
    {
        await db.SaveChangesAsync();
    }
}
