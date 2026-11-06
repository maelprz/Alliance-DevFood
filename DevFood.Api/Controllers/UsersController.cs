using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public record UserPatch(
    string? Name,
    string? Email,
    string? Phone,
    string? AddressStreet,
    string? AddressCity,
    string? AddressZip,
    string? CurrentPassword,
    string? NewPassword);

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(AppDbContext db) : ControllerBase
{
    static readonly TimeSpan NameCooldown = TimeSpan.FromDays(30);
    const int MaxPageSize = 100;

    // Single user shape shared by login, register and profile (never includes the hash).
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

    // Admin list of registered users. Without ?page it returns everyone; with ?page it
    // returns one page and puts the overall count in the X-Total-Count header.
    [Authorize(Roles = "admin")]
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        [FromQuery] string? search)
    {
        var query = db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(u => EF.Functions.ILike(u.FullName, pattern) || EF.Functions.ILike(u.Email, pattern));
        }
        query = query.OrderBy(u => u.Id);

        if (page is not null)
        {
            var size = Math.Clamp(pageSize ?? 10, 1, MaxPageSize);
            var current = Math.Max(page.Value, 1);
            Response.Headers["X-Total-Count"] = (await query.CountAsync()).ToString();
            query = query.Skip((current - 1) * size).Take(size);
        }
        return Ok((await query.ToListAsync()).Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        if (!User.CanAccessUser(id)) return Forbid();
        var user = await db.Users.FindAsync(id);
        return user is null ? NotFound(new { message = "User not found." }) : Ok(ToDto(user));
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Patch(int id, UserPatch req)
    {
        if (!User.CanAccessUser(id)) return Forbid();
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        var name = req.Name?.Trim();
        if (name is not null && name != user.FullName)
        {
            if (name == "") return BadRequest(new { message = "Name cannot be empty." });
            if (user.NameChangedAt is { } changed && DateTime.UtcNow - changed < NameCooldown)
            {
                var days = Math.Ceiling((changed + NameCooldown - DateTime.UtcNow).TotalDays);
                return BadRequest(new { message = $"You can change your name again in {days} day(s)." });
            }
            user.FullName = name;
            user.NameChangedAt = DateTime.UtcNow;
        }

        var email = req.Email?.Trim().ToLowerInvariant();
        if (email is not null && email != user.Email)
        {
            if (!email.Contains('@')) return BadRequest(new { message = "Enter a valid email address." });
            if (await db.Users.AnyAsync(u => u.Email == email && u.Id != id))
                return Conflict(new { message = "That email is already in use." });
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
                return BadRequest(new { message = "Current password is incorrect." });
            if (req.NewPassword.Length < 8)
                return BadRequest(new { message = "New password must be at least 8 characters." });
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        }

        await db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    // Soft delete: the row (and the user's order history) stays, but login is blocked
    // and any tokens the user already holds are rejected on their next request.
    [Authorize(Roles = "admin")]
    [HttpPatch("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });
        if (user.Id == User.UserId()) return BadRequest(new { message = "You can't deactivate your own account." });
        if (user.Role == "admin") return BadRequest(new { message = "Admin accounts can't be deactivated here." });

        if (user.IsActive)
        {
            user.IsActive = false;
            user.DeactivatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        return Ok(ToDto(user));
    }

    [Authorize(Roles = "admin")]
    [HttpPatch("{id:int}/reactivate")]
    public async Task<IActionResult> Reactivate(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });
        if (!user.IsActive)
        {
            user.IsActive = true;
            user.DeactivatedAt = null;
            await db.SaveChangesAsync();
        }
        return Ok(ToDto(user));
    }
}
