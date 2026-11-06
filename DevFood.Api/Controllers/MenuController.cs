using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

// food_id and any other client-generated fields in the body are ignored; the server owns ids.
public record MenuWrite(
    string? Name,
    decimal? Price,
    string? Category,
    string? Description,
    string? Image,
    bool? Availability);

[ApiController]
[Route("api/menu")]
public class MenuController(AppDbContext db) : ControllerBase
{
    static object ToDto(MenuItem m) => new
    {
        food_id = m.Id,
        name = m.Name,
        price = m.Price,
        category = m.Category,
        description = m.Description,
        image = m.ImageUrl,
        availability = m.IsAvailable
    };

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok((await db.MenuItems.OrderBy(m => m.Id).ToListAsync()).Select(ToDto));

    [HttpPost]
    public async Task<IActionResult> Create(MenuWrite req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || req.Price is null or < 0 || string.IsNullOrWhiteSpace(req.Category))
            return BadRequest(new { message = "Name, a non-negative price and category are required." });

        var item = new MenuItem
        {
            Name = req.Name.Trim(),
            Price = req.Price.Value,
            Category = req.Category.Trim(),
            Description = req.Description?.Trim() ?? "",
            ImageUrl = req.Image,
            IsAvailable = req.Availability ?? true
        };
        db.MenuItems.Add(item);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(item));
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Patch(int id, MenuWrite req)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null) return NotFound(new { message = "Menu item not found." });
        if (req.Price is < 0) return BadRequest(new { message = "Price cannot be negative." });

        if (!string.IsNullOrWhiteSpace(req.Name)) item.Name = req.Name.Trim();
        if (req.Price is { } price) item.Price = price;
        if (!string.IsNullOrWhiteSpace(req.Category)) item.Category = req.Category.Trim();
        if (req.Description is not null) item.Description = req.Description.Trim();
        if (req.Image is not null) item.ImageUrl = req.Image;
        if (req.Availability is { } available) item.IsAvailable = available;

        await db.SaveChangesAsync();
        return Ok(ToDto(item));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null) return NotFound(new { message = "Menu item not found." });
        db.MenuItems.Remove(item);
        await db.SaveChangesAsync();
        return Ok(new { message = "Menu item deleted." });
    }
}
