using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

public record CartLine(
    [property: JsonPropertyName("food_id")] int FoodId,
    [property: JsonPropertyName("quantity")] int Quantity);

public record CartPut(
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

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var userId = User.UserId();
        if (userId is null) return Unauthorized();
        return Ok(await Load(userId.Value));
    }

    [Authorize]
    [HttpPut]
    public async Task<IActionResult> Put(CartPut req)
    {
        var userId = User.UserId();
        if (userId is null) return Unauthorized();
        if (req.Items is null)
            return BadRequest(new { message = "items must be an array." });

        var lines = req.Items
            .Where(i => i.Quantity >= 1)
            .GroupBy(i => i.FoodId)
            .Select(g => new CartLine(g.Key, Math.Min(g.Sum(x => x.Quantity), 99)))
            .ToList();
        var ids = lines.Select(l => l.FoodId).ToList();
        var valid = await db.MenuItems
            .Where(m => ids.Contains(m.Id))
            .Select(m => m.Id).ToListAsync();

        try
        {
            await using var tx = await db.Database.BeginTransactionAsync();
            await db.CartItems.Where(c => c.UserId == userId).ExecuteDeleteAsync();
            foreach (var l in lines.Where(l => valid.Contains(l.FoodId)))
                db.CartItems.Add(new CartItem
                {
                    UserId = userId.Value,
                    MenuItemId = l.FoodId,
                    Quantity = l.Quantity
                });
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Your cart was updated by another request. Please try again." });
        }

        return Ok(await Load(userId.Value));
    }

    // ... keep FindValidCoupon, ApplyCoupon and ApplyCouponRequest below, unchanged
}