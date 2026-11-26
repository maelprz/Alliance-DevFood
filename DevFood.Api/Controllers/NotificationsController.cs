using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/notifications")]
public class NotificationsController(NotificationService service) : ControllerBase
{
    [Authorize(Policy = Permissions.NotificationsReadOwn)]
    [HttpGet]
    public async Task<IActionResult> ForUser([FromQuery(Name = "user_id")] int userId)
    {
        var result = await service.ForUser(userId, User.CurrentUser());
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("all")]
    public async Task<IActionResult> All()
    {
        var result = await service.GetBroadcasts();
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpPost]
    public async Task<IActionResult> Create(NotificationCreate request)
    {
        var result = await service.CreateBroadcast(request);
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await service.DeleteBroadcast(id);
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Policy = Permissions.NotificationsReadOwn)]
    [HttpPatch("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, NotificationReadRequest request)
    {
        var result = await service.MarkRead(id, request.UserId, User.CurrentUser());
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Policy = Permissions.NotificationsReadOwn)]
    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead(NotificationReadRequest request)
    {
        var result = await service.MarkAllRead(request.UserId, User.CurrentUser());
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Policy = Permissions.NotificationsReadOwn)]
    [HttpGet("older")]
    public async Task<IActionResult> Older([FromQuery(Name = "user_id")] int userId, [FromQuery] int page = 1)
    {
        var result = await service.Older(userId, page, User.CurrentUser());
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Roles = Roles.Admin)]
    [HttpGet("new-users")]
    public async Task<IActionResult> NewUserMessages()
    {
        var result = await service.GetNewUserMessages();
        return StatusCode(result.StatusCode, result.Value);
    }
}
