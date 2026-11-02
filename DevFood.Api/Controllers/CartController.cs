using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public record CartLine(
    [property: JsonPropertyName("food_id")] int FoodId,
    [property: JsonPropertyName("quantity")] int Quantity);

public record CartPut(
    [property: JsonPropertyName("user_id")] int UserId,
    [property: JsonPropertyName("items")] List<CartLine>? Items);

[ApiController]
[Route("api/cart")]
public class CartController(AppDbContext db) : ControllerBase
{
    private async Task<object> Load(int userId)
    {
        var items = await db.CartItems
            .Where(c => c.UserId == userId)
            .Select(c => new
            {
                food_id = c.MenuItemId,
                name = c.MenuItem.Name,
                price = c.MenuItem.Price,
                category = c.MenuItem.Category,
                image = c.MenuItem.ImageUrl,
                description = c.MenuItem.Description,
                availability = c.MenuItem.IsAvailable,
                quantity = c.Quantity
            }).ToListAsync();
        return new { user_id = userId, items };
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery(Name = "user_id")] int userId)
        => Ok(await Load(userId));

    [HttpPut]
    public async Task<IActionResult> Put(CartPut req)
    {
        if (req.Items is null)
            return BadRequest(new { message = "items must be an array." });
        if (!await db.Users.AnyAsync(u => u.Id == req.UserId))
            return NotFound(new { message = "User not found." });

        var lines = req.Items
            .Where(i => i.Quantity >= 1)
            .GroupBy(i => i.FoodId)
            .Select(g => new CartLine(g.Key, g.Sum(x => x.Quantity)))
            .ToList();
        var ids = lines.Select(l => l.FoodId).ToList();
        var valid = await db.MenuItems
            .Where(m => ids.Contains(m.Id))
            .Select(m => m.Id).ToListAsync();

        db.CartItems.RemoveRange(db.CartItems.Where(c => c.UserId == req.UserId));
        foreach (var l in lines.Where(l => valid.Contains(l.FoodId)))
            db.CartItems.Add(new CartItem
            {
                UserId = req.UserId,
                MenuItemId = l.FoodId,
                Quantity = l.Quantity
            });
        await db.SaveChangesAsync();

        return Ok(await Load(req.UserId));
    }
}