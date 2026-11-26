using Microsoft.EntityFrameworkCore;

public record UserNotification(Notification Notification, bool IsRead);

// own notifs + broadcasts (UserId null)
public class NotificationRepository(AppDbContext db)
{
    public Task<List<UserNotification>> ForUser(int userId, DateTime since, string broadcastAudience)
    {
        return db.Notifications
            .Where(n => (n.UserId == userId || (n.UserId == null && n.Audience == broadcastAudience)) && n.CreatedAt >= since)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new UserNotification(
                n,
                db.NotificationReads.Any(r => r.NotificationId == n.Id && r.UserId == userId)))
            .ToListAsync();
    }

    public Task<bool> IsVisibleTo(int notificationId, int userId)
    {
        return db.Notifications.AnyAsync(n => n.Id == notificationId && (n.UserId == userId || n.UserId == null));
    }

    public Task<bool> IsRead(int notificationId, int userId)
    {
        return db.NotificationReads.AnyAsync(r => r.NotificationId == notificationId && r.UserId == userId);
    }

    public Task<List<int>> UnreadIds(int userId)
    {
        return db.Notifications
            .Where(n => (n.UserId == userId || n.UserId == null)
                && !db.NotificationReads.Any(r => r.NotificationId == n.Id && r.UserId == userId))
            .Select(n => n.Id)
            .ToListAsync();
    }

    public async Task AddReads(IEnumerable<int> notificationIds, int userId)
    {
        db.NotificationReads.AddRange(notificationIds.Select(id => new NotificationRead { NotificationId = id, UserId = userId }));
        await db.SaveChangesAsync();
    }

    // broadcasts only, newest first
    public Task<List<Notification>> Broadcasts(string audience)
    {
        return db.Notifications
            .Where(n => n.UserId == null && n.Audience == audience)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
    }

    public async Task<Notification?> Find(int id)
    {
        return await db.Notifications.FindAsync(id);
    }

    public async Task Add(Notification notification)
    {
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();
    }

    public async Task Save()
    {
        await db.SaveChangesAsync();
    }

    // between oldest and before, newest first, paged
    public async Task<NotificationPage> Older(int userId, string broadcastAudience, DateTime oldest, DateTime before, int page, int pageSize)
    {
        var query = db.Notifications
            .Where(n => (n.UserId == userId || (n.UserId == null && n.Audience == broadcastAudience))
                && n.CreatedAt >= oldest && n.CreatedAt < before);
        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .ThenByDescending(n => n.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new UserNotification(
                n,
                db.NotificationReads.Any(r => r.NotificationId == n.Id && r.UserId == userId)))
            .ToListAsync();
        return new NotificationPage(items, total);
    }

    // bulk soft delete, skips keepAudience (new user msgs)
    public Task<int> SoftDeleteCreatedBefore(DateTime cutoff, string keepAudience)
    {
        return db.Notifications
            .Where(n => n.CreatedAt < cutoff && n.Audience != keepAudience)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsDeleted, true));
    }

    // saved msgs for an audience, oldest first
    public Task<List<Notification>> Templates(string audience)
    {
        return db.Notifications.AsNoTracking()
            .Where(n => n.UserId == null && n.Audience == audience)
            .OrderBy(n => n.CreatedAt)
            .ToListAsync();
    }

    public async Task AddMany(IEnumerable<Notification> list)
    {
        db.Notifications.AddRange(list);
        await db.SaveChangesAsync();
    }
}

public record NotificationPage(List<UserNotification> Items, int Total);
