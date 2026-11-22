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
            catch (Exception e) when (e is not OperationCanceledException)
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
