using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

public record MenuWrite(string? Name, decimal? Price, string? Category, string? Description, string? Image, bool? Availability);

[ApiController]
[Route("api/menu")]
public class MenuController(MenuService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await service.GetAll();
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Roles = "admin")]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAdmin([FromQuery] string? category, [FromQuery] int page = 1)
    {
        var result = await service.GetAdmin(category, page);
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Roles = "admin")]
    [HttpPost("image")]
    [RequestSizeLimit(5 * 1024 * 1024 + 65536)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile? imageFile)
    {
        var result = await service.UploadImage(imageFile);
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<IActionResult> Create(MenuWrite request)
    {
        var result = await service.Create(request);
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Roles = "admin")]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Patch(int id, MenuWrite request)
    {
        var result = await service.Patch(id, request);
        return StatusCode(result.StatusCode, result.Value);
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await service.Delete(id);
        return StatusCode(result.StatusCode, result.Value);
    }
}
