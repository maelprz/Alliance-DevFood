// customer: get notifs, mark read
// admin: send/delete announcements
public class NotificationService(NotificationRepository notifications, CouponRepository coupons, UserRepository users)
{
    public static object ToDto(Notification n, bool? isRead = null) => new
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

    public async Task<ServiceResult> ForUser(int userId, CurrentUser me)
    {
        if (!me.CanAccess(userId)) return CurrentUser.Denied();
        var joined = await JoinedAt(userId);
        if (joined is null) return ServiceResults.Ok(Array.Empty<object>());
        var since = Later(DateTime.UtcNow - NotificationRules.BellWindow, joined.Value);
        var list = await notifications.ForUser(userId, since, BroadcastAudiences.All);
        return ServiceResults.Ok(list.Select(x => ToDto(x.Notification, x.IsRead)));
    }

    public async Task<ServiceResult> MarkRead(int notificationId, int userId, CurrentUser me)
    {
        if (!me.CanAccess(userId)) return CurrentUser.Denied();
        if (!await notifications.IsVisibleTo(notificationId, userId))
            return ServiceResults.NotFound(new { message = AuthMessages.NotificationNotFound });
        if (!await notifications.IsRead(notificationId, userId))
            await notifications.AddReads([notificationId], userId);
        return ServiceResults.Ok(new { message = "Marked as read." });
    }

    public async Task<ServiceResult> MarkAllRead(int userId, CurrentUser me)
    {
        if (!me.CanAccess(userId)) return CurrentUser.Denied();
        var unread = await notifications.UnreadIds(userId);
        await notifications.AddReads(unread, userId);
        return ServiceResults.Ok(new { message = "All notifications marked as read." });
    }

    public async Task<ServiceResult> GetBroadcasts()
    {
        var list = await notifications.Broadcasts(BroadcastAudiences.All);
        return ServiceResults.Ok(list.Select(n => ToDto(n)));
    }

    public async Task<ServiceResult> CreateBroadcast(NotificationCreate req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Message))
            return ServiceResults.BadRequest(new { message = "Title and message are both required." });

        var couponCode = string.IsNullOrWhiteSpace(req.CouponCode) ? null : req.CouponCode.Trim().ToUpperInvariant();
        if (couponCode is not null && await coupons.Find(couponCode) is null)
            return ServiceResults.BadRequest(new { message = "That coupon does not exist." });

        // new_users is saved for future signups, others go to everyone
        var audience = req.Audience?.Trim() == BroadcastAudiences.NewUsers ? BroadcastAudiences.NewUsers : BroadcastAudiences.All;
        var notification = new Notification
        {
            Type = couponCode is null ? BroadcastTypes.General : BroadcastTypes.Coupon,
            Title = req.Title.Trim(),
            Message = req.Message.Trim(),
            Audience = audience,
            CouponCode = couponCode
        };
        await notifications.Add(notification);
        return ServiceResults.StatusCode(201, ToDto(notification));
    }

    // soft delete
    public async Task<ServiceResult> DeleteBroadcast(int id)
    {
        var notification = await notifications.Find(id);
        if (notification is null) return ServiceResults.NotFound(new { message = AuthMessages.NotificationNotFound });
        notification.IsDeleted = true;
        await notifications.Save();
        return ServiceResults.Ok(new { message = "Notification deleted." });
    }

    // older than 7 days (up to 30), 10 per page
    public async Task<ServiceResult> Older(int userId, int page, CurrentUser me)
    {
        if (!me.CanAccess(userId)) return CurrentUser.Denied();
        var joined = await JoinedAt(userId);
        if (joined is null) return ServiceResults.Ok(new { items = Array.Empty<object>(), total = 0, page = 1, totalPages = 1 });
        var current = Math.Max(page, 1);
        var now = DateTime.UtcNow;
        var oldest = Later(now - NotificationRules.KeepFor, joined.Value);
        var result = await notifications.Older(
            userId, BroadcastAudiences.All, oldest, now - NotificationRules.BellWindow, current, NotificationRules.OlderPageSize);
        var totalPages = Math.Max(1, (int)Math.Ceiling(result.Total / (double)NotificationRules.OlderPageSize));
        return ServiceResults.Ok(new
        {
            items = result.Items.Select(x => ToDto(x.Notification, x.IsRead)),
            total = result.Total,
            page = current,
            totalPages
        });
    }

    // used by cleanup job, new user msgs are kept
    public Task<int> ExpireOld()
    {
        return notifications.SoftDeleteCreatedBefore(DateTime.UtcNow - NotificationRules.KeepFor, BroadcastAudiences.NewUsers);
    }

    // copy saved new user msgs to the new account
    public async Task<int> WelcomeNewUser(int userId)
    {
        var templates = await notifications.Templates(BroadcastAudiences.NewUsers);
        var copies = templates.Select(t => new Notification
        {
            UserId = userId,
            Type = t.Type,
            Title = t.Title,
            Message = t.Message,
            Audience = NotificationAudiences.User,
            CouponCode = t.CouponCode
        }).ToList();
        if (copies.Count > 0) await notifications.AddMany(copies);
        return copies.Count;
    }

    // only announcements after the account was made
    async Task<DateTime?> JoinedAt(int userId) => (await users.Find(userId))?.CreatedAt;

    static DateTime Later(DateTime a, DateTime b) => a > b ? a : b;

    // saved new user msgs (admin)
    public async Task<ServiceResult> GetNewUserMessages()
    {
        var list = await notifications.Templates(BroadcastAudiences.NewUsers);
        return ServiceResults.Ok(list.Select(n => ToDto(n)));
    }
}
