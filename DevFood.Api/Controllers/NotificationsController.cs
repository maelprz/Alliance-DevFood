using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public record NotificationCreate(string? Title, string? Message, string? Audience, string? CouponCode);

public record NotificationReadRequest(
    [property: JsonPropertyName("user_id")] int UserId);

[ApiController]
[Route("api/notifications")]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    static object ToDto(Notification n, bool? isRead = null) => new
    {
        id = n.Id,
        type = n.Type,
        title = n.Title,
        message = n.Message,
        audience = n.Audience,
        couponCode = n.CouponCode,
        createdAt = n.CreatedAt,
        isRead
    };

    // A customer's feed: their direct notifications plus every broadcast, newest first.
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> ForUser([FromQuery(Name = "user_id")] int userId)
    {
        if (!User.CanAccessUser(userId)) return Forbid();
        var list = await db.Notifications
            .Where(n => n.UserId == userId || n.UserId == null)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new
            {
                n,
                isRead = db.NotificationReads.Any(r => r.NotificationId == n.Id && r.UserId == userId)
            })
            .ToListAsync();
        return Ok(list.Select(x => ToDto(x.n, x.isRead)));
    }

    // Admin history: broadcasts only (order updates are per-customer noise).
    [HttpGet("all")]
    public async Task<IActionResult> All()
    {
        var list = await db.Notifications
            .Where(n => n.UserId == null)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
        return Ok(list.Select(n => ToDto(n)));
    }

    [HttpPost]
    public async Task<IActionResult> Create(NotificationCreate req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Message))
            return BadRequest(new { message = "Title and message are both required." });

        var couponCode = string.IsNullOrWhiteSpace(req.CouponCode) ? null : req.CouponCode.Trim().ToUpperInvariant();
        if (couponCode is not null && !await db.Coupons.AnyAsync(c => c.Code == couponCode))
            return BadRequest(new { message = "That coupon does not exist." });

        var notification = new Notification
        {
            Type = couponCode is null ? "broadcast" : "coupon",
            Title = req.Title.Trim(),
            Message = req.Message.Trim(),
            Audience = "all",
            CouponCode = couponCode
        };
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(notification));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var notification = await db.Notifications.FindAsync(id);
        if (notification is null) return NotFound(new { message = "Notification not found." });
        db.NotificationReads.RemoveRange(db.NotificationReads.Where(r => r.NotificationId == id));
        db.Notifications.Remove(notification);
        await db.SaveChangesAsync();
        return Ok(new { message = "Notification deleted." });
    }

    [Authorize]
    [HttpPatch("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, NotificationReadRequest req)
    {
        if (!User.CanAccessUser(req.UserId)) return Forbid();
        var visible = await db.Notifications
            .AnyAsync(n => n.Id == id && (n.UserId == req.UserId || n.UserId == null));
        if (!visible) return NotFound(new { message = "Notification not found." });
        if (!await db.NotificationReads.AnyAsync(r => r.NotificationId == id && r.UserId == req.UserId))
        {
            db.NotificationReads.Add(new NotificationRead { NotificationId = id, UserId = req.UserId });
            await db.SaveChangesAsync();
        }
        return Ok(new { message = "Marked as read." });
    }

    [Authorize]
    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead(NotificationReadRequest req)
    {
        if (!User.CanAccessUser(req.UserId)) return Forbid();
        var unread = await db.Notifications
            .Where(n => (n.UserId == req.UserId || n.UserId == null)
                && !db.NotificationReads.Any(r => r.NotificationId == n.Id && r.UserId == req.UserId))
            .Select(n => n.Id)
            .ToListAsync();
        db.NotificationReads.AddRange(unread.Select(id => new NotificationRead { NotificationId = id, UserId = req.UserId }));
        await db.SaveChangesAsync();
        return Ok(new { message = "All notifications marked as read." });
    }
}
