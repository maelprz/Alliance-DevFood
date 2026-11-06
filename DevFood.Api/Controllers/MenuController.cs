using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
    private static object ToDto(MenuItem item)
    {
        return new
        {
            food_id = item.Id,
            name = item.Name,
            price = item.Price,
            category = item.Category,
            description = item.Description,
            image = item.ImageUrl,
            availability = item.IsAvailable
        };
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await db.MenuItems.OrderBy(item => item.Id).ToListAsync();
        return Ok(items.Select(ToDto));
    }

    [Authorize(Roles = "admin")]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAdmin([FromQuery] string? category, [FromQuery] int page = 1)
    {
        var query = db.MenuItems.AsNoTracking().AsQueryable();
        if (string.IsNullOrWhiteSpace(category) == false && category != "All")
        {
            query = query.Where(item => item.Category == category);
        }

        const int pageSize = 10;
        var total = await query.CountAsync();
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var currentPage = Math.Clamp(page, 1, totalPages);
        var items = await query
            .OrderByDescending(item => item.Category == "Burger")
            .ThenByDescending(item => item.Category == "Sandwich")
            .ThenByDescending(item => item.Category == "Chicken")
            .ThenByDescending(item => item.Category == "Pizzas")
            .ThenByDescending(item => item.Category == "Rice Meals")
            .ThenByDescending(item => item.Category == "Snacks")
            .ThenByDescending(item => item.Category == "Spaghetti")
            .ThenByDescending(item => item.Category == "Dessert")
            .ThenByDescending(item => item.Category == "Drinks")
            .ThenByDescending(item => item.Id)
            .Skip((currentPage - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { items = items.Select(ToDto), total, page = currentPage, totalPages });
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<IActionResult> Create(MenuWrite request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Name is required." });
        }

        if (string.IsNullOrWhiteSpace(request.Category))
        {
            return BadRequest(new { message = "Category is required." });
        }

        if (request.Price.HasValue == false)
        {
            return BadRequest(new { message = "Price is required." });
        }

        if (request.Price.Value < 0 || request.Price.Value > 99999999.99m)
        {
            return BadRequest(new { message = "Price must be between 0 and 99999999.99." });
        }

        var item = new MenuItem
        {
            Name = request.Name.Trim(),
            Price = request.Price.Value,
            Category = request.Category.Trim(),
            Description = "",
            ImageUrl = request.Image,
            IsAvailable = true
        };

        if (request.Description is not null)
        {
            item.Description = request.Description.Trim();
        }

        if (request.Availability.HasValue)
        {
            item.IsAvailable = request.Availability.Value;
        }

        db.MenuItems.Add(item);
        await db.SaveChangesAsync();
        return StatusCode(201, ToDto(item));
    }

    [Authorize(Roles = "admin")]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Patch(int id, MenuWrite request)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null)
        {
            return NotFound(new { message = "Menu item not found." });
        }

        if (request.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Name cannot be empty." });
            }

            item.Name = request.Name.Trim();
        }

        if (request.Category is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Category))
            {
                return BadRequest(new { message = "Category cannot be empty." });
            }

            item.Category = request.Category.Trim();
        }

        if (request.Price.HasValue)
        {
            if (request.Price.Value < 0 || request.Price.Value > 99999999.99m)
            {
                return BadRequest(new { message = "Price must be between 0 and 99999999.99." });
            }

            item.Price = request.Price.Value;
        }

        if (request.Description is not null)
        {
            item.Description = request.Description.Trim();
        }

        if (request.Image is not null)
        {
            item.ImageUrl = request.Image;
        }

        if (request.Availability.HasValue)
        {
            item.IsAvailable = request.Availability.Value;
        }

        await db.SaveChangesAsync();
        return Ok(ToDto(item));
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null)
        {
            return NotFound(new { message = "Menu item not found." });
        }

        item.IsDeleted = true;
        item.IsAvailable = false;
        await db.SaveChangesAsync();
        return Ok(new { message = "Menu item deleted." });
    }
}
