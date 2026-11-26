using System.Text.Json;
using System.Text.Json.Nodes;

public record UserList(IEnumerable<object> Users, int? TotalCount);

public class UserService(UserRepository users)
{
    public static object ToDto(User u) => new
    {
        id = u.Id,
        name = u.FullName,
        email = u.Email,
        role = u.Role,
        phone = u.Phone,
        addressStreet = u.AddressStreet,
        addressCity = u.AddressCity,
        addressZip = u.AddressZip,
        isActive = u.IsActive,
        deactivatedAt = u.DeactivatedAt,
        nameChangedAt = u.NameChangedAt,
        createdAt = u.CreatedAt
    };

    // user + permissions, for login and /auth/me
    public static JsonObject ToSessionDto(User u, IEnumerable<string> permissions)
    {
        var dto = JsonSerializer.SerializeToNode(ToDto(u))!.AsObject();
        dto["permissions"] = new JsonArray(permissions.Select(p => (JsonNode?)JsonValue.Create(p)).ToArray());
        return dto;
    }

    static ServiceResult NotFound() => ServiceResults.NotFound(new { message = AuthMessages.UserNotFound });

    public async Task<UserList> GetAll(int? page, int? pageSize, string? search, string? sort, string? dir)
    {
        var size = Math.Clamp(pageSize ?? AuthRules.DefaultPageSize, 1, AuthRules.MaxPageSize);
        int? current = page is null ? null : Math.Max(page.Value, 1);
        var descending = string.Equals(dir?.Trim(), UserSortKeys.Descending, StringComparison.OrdinalIgnoreCase);
        var result = await users.Search(search, ParseSort(sort), descending, current, size);
        return new UserList(result.Users.Select(ToDto), result.Total);
    }

    // default is joined
    static UserSortField ParseSort(string? sort) => sort?.Trim().ToLowerInvariant() switch
    {
        UserSortKeys.Name => UserSortField.Name,
        UserSortKeys.Email => UserSortField.Email,
        UserSortKeys.Role => UserSortField.Role,
        UserSortKeys.Status => UserSortField.Status,
        _ => UserSortField.Joined,
    };

    public async Task<ServiceResult> Get(int id, CurrentUser me)
    {
        if (!me.CanAccess(id)) return CurrentUser.Denied();
        var user = await users.Find(id);
        if (user is null) return NotFound();
        return ServiceResults.Ok(ToDto(user));
    }

    // owner only, admin can't edit others
    public async Task<ServiceResult> Update(int id, CurrentUser me, UserPatch req)
    {
        if (me.Id != id) return CurrentUser.Denied();
        var user = await users.Find(id);
        if (user is null) return NotFound();

        var name = req.Name?.Trim();
        if (name is not null && name != user.FullName)
        {
            if (name == "") return ServiceResults.BadRequest(new { message = "Name cannot be empty." });
            if (user.NameChangedAt is { } changed && DateTime.UtcNow - changed < AuthRules.NameChangeCooldown)
            {
                var days = Math.Ceiling((changed + AuthRules.NameChangeCooldown - DateTime.UtcNow).TotalDays);
                return ServiceResults.BadRequest(new { message = $"You can change your name again in {days} day(s)." });
            }
            user.FullName = name;
            user.NameChangedAt = DateTime.UtcNow;
        }

        var email = req.Email?.Trim().ToLowerInvariant();
        if (email is not null && email != user.Email)
        {
            if (!email.Contains('@')) return ServiceResults.BadRequest(new { message = AuthMessages.InvalidEmail });
            if (await users.EmailInUse(email, id))
                return ServiceResults.Conflict(new { message = "That email is already in use." });
            user.Email = email;
        }

        if (req.Phone is not null) user.Phone = req.Phone.Trim();
        if (req.AddressStreet is not null) user.AddressStreet = req.AddressStreet.Trim();
        if (req.AddressCity is not null) user.AddressCity = req.AddressCity.Trim();
        if (req.AddressZip is not null) user.AddressZip = req.AddressZip.Trim();

        if (req.NewPassword is not null)
        {
            if (string.IsNullOrEmpty(req.CurrentPassword)
                || !BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
                return ServiceResults.BadRequest(new { message = "Current password is incorrect." });
            if (req.NewPassword.Length < AuthRules.PasswordMinLength)
                return ServiceResults.BadRequest(new { message = $"New password must be at least {AuthRules.PasswordMinLength} characters." });
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        }

        await users.Save();
        return ServiceResults.Ok(ToDto(user));
    }

    // soft delete so orders keep the customer
    public async Task<ServiceResult> Deactivate(int id, CurrentUser me)
    {
        var user = await users.Find(id);
        if (user is null) return NotFound();
        if (user.Id == me.Id) return ServiceResults.BadRequest(new { message = "You can't deactivate your own account." });
        if (user.Role == Roles.Admin) return ServiceResults.BadRequest(new { message = "Admin accounts can't be deactivated here." });

        if (user.IsActive)
        {
            user.IsActive = false;
            user.DeactivatedAt = DateTime.UtcNow;
            await users.Save();
        }
        return ServiceResults.Ok(ToDto(user));
    }

    public async Task<ServiceResult> Reactivate(int id)
    {
        var user = await users.Find(id);
        if (user is null) return NotFound();
        if (!user.IsActive)
        {
            user.IsActive = true;
            user.DeactivatedAt = null;
            await users.Save();
        }
        return ServiceResults.Ok(ToDto(user));
    }
}
