using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/statistics")]
[Authorize(Roles = "admin")]
public class AdminStatisticsController(AdminStatisticsService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var result = await service.Get();
        return StatusCode(result.StatusCode, result.Value);
    }
}
