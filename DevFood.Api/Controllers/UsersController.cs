using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(UserService service) : ControllerBase
{
    [Authorize(Policy = Permissions.UsersView)]
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        [FromQuery] string? search,
        [FromQuery] string? sort,
        [FromQuery] string? dir)
    {
        var result = await service.GetAll(page, pageSize, search, sort, dir);
        if (result.TotalCount is { } total) Response.Headers[ResponseHeaders.TotalCount] = total.ToString();
        return Ok(result.Users);
    }

    [Authorize(Policy = Permissions.ProfileManageOwn)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var result = await service.Get(id, User.CurrentUser());
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Policy = Permissions.ProfileManageOwn)]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Patch(int id, UserPatch request)
    {
        var result = await service.Update(id, User.CurrentUser(), request);
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Policy = Permissions.UsersDeactivate)]
    [HttpPatch("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var result = await service.Deactivate(id, User.CurrentUser());
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Policy = Permissions.UsersDeactivate)]
    [HttpPatch("{id:int}/reactivate")]
    public async Task<IActionResult> Reactivate(int id)
    {
        var result = await service.Reactivate(id);
        return StatusCode(result.StatusCode, result.Value);
    }
}
