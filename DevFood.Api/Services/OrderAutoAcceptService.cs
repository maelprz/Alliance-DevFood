// Background job: the "kitchen" accepts orders automatically. Every few
// seconds it moves Pending orders whose cancel window has ended to Preparing.
// The rule itself lives in OrderService.AutoAcceptExpiredAsync.
public class OrderAutoAcceptService(IServiceScopeFactory scopes, ILogger<OrderAutoAcceptService> log)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var orderService = scope.ServiceProvider.GetRequiredService<OrderService>();
                var accepted = await orderService.AutoAcceptExpiredAsync();
                if (accepted > 0) log.LogInformation("Auto-accepted {Count} order(s)", accepted);
            }
            // Any failure (including a database timeout, which .NET reports as a
            // TaskCanceledException) just skips this run. Only an app shutdown
            // (stoppingToken) may end the loop — otherwise the job would stop
            // silently while the rest of the API keeps running.
            catch (Exception e) when (!stoppingToken.IsCancellationRequested)
            {
                log.LogWarning(e, "Auto-accept run failed; trying again next run");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(OrderRules.AutoAcceptCheckSeconds), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
