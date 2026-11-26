// runs on startup then every hour, see NotificationService.ExpireOld
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
            // if a run fails just try again next time
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
