// Background job: once at startup and then every hour, notifications older than
// 30 days are soft-deleted (IsDeleted = true) so they never show again.
// The rule itself lives in NotificationService.ExpireOld.
public class NotificationCleanupService(IServiceScopeFactory scopes, ILogger<NotificationCleanupService> log)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var notificationService = scope.ServiceProvider.GetRequiredService<NotificationService>();
                var expired = await notificationService.ExpireOld();
                if (expired > 0) log.LogInformation("Soft-deleted {Count} notification(s) older than 30 days", expired);
            }
            // A failed run (for example a database timeout) is skipped; only app shutdown ends the loop.
            catch (Exception e) when (!stoppingToken.IsCancellationRequested)
            {
                log.LogWarning(e, "Notification cleanup failed; trying again next run");
            }

            try
            {
                await Task.Delay(NotificationRules.CleanupInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
