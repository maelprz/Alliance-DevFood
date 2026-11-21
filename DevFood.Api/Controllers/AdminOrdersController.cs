using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "admin")]
public class AdminOrdersController(AdminOrdersService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int page = 1, [FromQuery] string? search = null, [FromQuery] string status = "All")
    {
        var result = await service.Get(page, search, status);
        return StatusCode(result.StatusCode, result.Value);
    }

    [HttpPost("hide")]
    public async Task<IActionResult> HideOrders([FromBody] List<int> orderIds)
    {
        var result = await service.HideOrders(orderIds);
        return StatusCode(result.StatusCode, result.Value);
    }
}
