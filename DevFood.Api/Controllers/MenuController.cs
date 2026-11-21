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
public class MenuController(AppDbContext db, IWebHostEnvironment environment) : ControllerBase
{
    private static readonly string[] Categories =
    [
        "Burger", "Sandwich", "Chicken", "Pizzas", "Rice Meals",
        "Snacks", "Spaghetti", "Dessert", "Drinks"
    ];

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
            .OrderByDescending(item => item.Id)
            .Skip((currentPage - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { items = items.Select(ToDto), total, page = currentPage, totalPages });
    }

    private static bool HasImageSignature(string contentType, byte[] header, int length)
    {
        if (contentType == "image/jpeg" && length >= 3)
        {
            return header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;
        }

        if (contentType == "image/png" && length >= 8)
        {
            byte[] png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
            return header.Take(8).SequenceEqual(png);
        }

        if (contentType == "image/gif" && length >= 6)
        {
            var signature = System.Text.Encoding.ASCII.GetString(header, 0, 6);
            return signature == "GIF87a" || signature == "GIF89a";
        }

        if (contentType == "image/webp" && length >= 12)
        {
            var riff = System.Text.Encoding.ASCII.GetString(header, 0, 4);
            var webp = System.Text.Encoding.ASCII.GetString(header, 8, 4);
            return riff == "RIFF" && webp == "WEBP";
        }

        return false;
    }

    [Authorize(Roles = "admin")]
    [HttpPost("image")]
    [RequestSizeLimit(5 * 1024 * 1024 + 65536)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile? imageFile)
    {
        if (imageFile is null || imageFile.Length == 0 || imageFile.Length > 5 * 1024 * 1024)
        {
            return BadRequest(new { message = "Choose an image up to 5 MB." });
        }

        var extension = "";
        if (imageFile.ContentType == "image/jpeg") extension = ".jpg";
        if (imageFile.ContentType == "image/png") extension = ".png";
        if (imageFile.ContentType == "image/gif") extension = ".gif";
        if (imageFile.ContentType == "image/webp") extension = ".webp";

        if (extension == "")
        {
            return BadRequest(new { message = "Choose a JPG, PNG, GIF, or WebP image." });
        }

        var header = new byte[12];
        int bytesRead;
        await using (var input = imageFile.OpenReadStream())
        {
            bytesRead = await input.ReadAtLeastAsync(header, header.Length, false);
        }

        if (HasImageSignature(imageFile.ContentType, header, bytesRead) == false)
        {
            return BadRequest(new { message = "The file contents do not match the selected image type." });
        }

        var fileName = Guid.NewGuid().ToString("N") + extension;
        var folder = Path.Combine(environment.ContentRootPath, "wwwroot", "uploads", "menu");
        var filePath = Path.Combine(folder, fileName);
        try
        {
            Directory.CreateDirectory(folder);
            await using var stream = new FileStream(filePath, FileMode.CreateNew);
            await imageFile.CopyToAsync(stream);
        }
        catch (IOException)
        {
            return StatusCode(503, new { message = "The image folder is unavailable. Please try again." });
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(503, new { message = "The backend cannot write to the image folder." });
        }

        return Ok(new { image = "/uploads/menu/" + fileName });
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<IActionResult> Create(MenuWrite request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Name is required." });
        }

        if (request.Name.Trim().Length > 100)
        {
            return BadRequest(new { message = "Name cannot exceed 100 characters." });
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return BadRequest(new { message = "Description is required." });
        }

        if (string.IsNullOrWhiteSpace(request.Category))
        {
            return BadRequest(new { message = "Category is required." });
        }

        if (Categories.Contains(request.Category.Trim()) == false)
        {
            return BadRequest(new { message = "Please choose a valid category." });
        }

        if (request.Price.HasValue == false)
        {
            return BadRequest(new { message = "Price is required." });
        }

        if (request.Price.Value < 0 || request.Price.Value > 9999m)
        {
            return BadRequest(new { message = "Price must be between 0 and 9999." });
        }

        if (decimal.Round(request.Price.Value, 2) != request.Price.Value)
        {
            return BadRequest(new { message = "Price can have at most two decimal places." });
        }

        var item = new MenuItem
        {
            Name = request.Name.Trim(),
            Price = request.Price.Value,
            Category = request.Category.Trim(),
            Description = request.Description.Trim(),
            ImageUrl = request.Image,
            IsAvailable = true
        };

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

            if (request.Name.Trim().Length > 100)
            {
                return BadRequest(new { message = "Name cannot exceed 100 characters." });
            }

            item.Name = request.Name.Trim();
        }

        if (request.Category is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Category))
            {
                return BadRequest(new { message = "Category cannot be empty." });
            }

            if (Categories.Contains(request.Category.Trim()) == false)
            {
                return BadRequest(new { message = "Please choose a valid category." });
            }

            item.Category = request.Category.Trim();
        }

        if (request.Price.HasValue)
        {
            if (request.Price.Value < 0 || request.Price.Value > 9999m)
            {
                return BadRequest(new { message = "Price must be between 0 and 9999." });
            }

            if (decimal.Round(request.Price.Value, 2) != request.Price.Value)
            {
                return BadRequest(new { message = "Price can have at most two decimal places." });
            }

            item.Price = request.Price.Value;
        }

        if (request.Description is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Description))
            {
                return BadRequest(new { message = "Description cannot be empty." });
            }

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