using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

public sealed record MenuItemDto(
    [property: JsonPropertyName("food_id")] int FoodId,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("price")] decimal Price,
    [property: JsonPropertyName("category")] string Category,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("image")] string? Image,
    [property: JsonPropertyName("availability")] bool Availability);

public class MenuService(MenuRepository repository, IWebHostEnvironment environment)
{
    private static readonly string[] Categories =
    [
        MenuCategories.Burger, 
        MenuCategories.Sandwich, 
        MenuCategories.Chicken, 
        MenuCategories.Pizzas, 
        MenuCategories.RiceMeals,
        MenuCategories.Snacks, 
        MenuCategories.Spaghetti, 
        MenuCategories.Dessert, 
        MenuCategories.Drinks
    ];

    private static MenuItemDto ToDto(MenuItem item) =>
        new(item.Id, 
        item.Name, 
        item.Price, 
        item.Category, 
        item.Description, 
        item.ImageUrl, 
        item.IsAvailable);

    public async Task<ServiceResult> GetAll()
    {
        var items = await repository.GetAll();
        return ServiceResults.Ok(items.Select(ToDto).ToList());
    }


    public async Task<ServiceResult> GetAdmin(string? category, int page = 1)
    {
        const int pageSize = 10;
        string? categoryFilter = null;
        if (string.IsNullOrWhiteSpace(category) == false && category != "All")
            categoryFilter = category;

        var total = await repository.Count(categoryFilter);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var currentPage = Math.Clamp(page, 1, totalPages);
        var offset = (currentPage - 1) * pageSize;
        var items = await repository.GetAdmin(categoryFilter, offset, pageSize, Categories, true);

        return ServiceResults.Ok(new { items = items.Select(ToDto).ToList(), total, page = currentPage, totalPages });
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



    public async Task<ServiceResult> UploadImage(IFormFile? imageFile)
    {
        if (imageFile is null || imageFile.Length == 0 || imageFile.Length > 5 * 1024 * 1024)
        {
            return ServiceResults.BadRequest(new { message = "Choose an image up to 5 MB." });
        }

        var extension = "";
        if (imageFile.ContentType == "image/jpeg") extension = ".jpg";
        if (imageFile.ContentType == "image/png") extension = ".png";
        if (imageFile.ContentType == "image/gif") extension = ".gif";
        if (imageFile.ContentType == "image/webp") extension = ".webp";

        if (extension == "")
        {
            return ServiceResults.BadRequest(new { message = "Choose a JPG, PNG, GIF, or WebP image." });
        }

        var header = new byte[12];
        int bytesRead;
        await using (var input = imageFile.OpenReadStream())
        {
            bytesRead = await input.ReadAtLeastAsync(header, header.Length, false);
        }

        if (HasImageSignature(imageFile.ContentType, header, bytesRead) == false)
        {
            return ServiceResults.BadRequest(new { message = "The file contents do not match the selected image type." });
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
            return ServiceResults.StatusCode(503, new { message = "The image folder is unavailable. Please try again." });
        }
        catch (UnauthorizedAccessException)
        {
            return ServiceResults.StatusCode(503, new { message = "The backend cannot write to the image folder." });
        }

        return ServiceResults.Ok(new { image = "/uploads/menu/" + fileName });
    }


    public async Task<ServiceResult> Create(MenuWrite request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return ServiceResults.BadRequest(new { message = "Name is required." });
        }

        if (request.Name.Trim().Length > 100)
        {
            return ServiceResults.BadRequest(new { message = "Name cannot exceed 100 characters." });
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return ServiceResults.BadRequest(new { message = "Description is required." });
        }

        if (string.IsNullOrWhiteSpace(request.Category))
        {
            return ServiceResults.BadRequest(new { message = "Category is required." });
        }

        if (Categories.Contains(request.Category.Trim()) == false)
        {
            return ServiceResults.BadRequest(new { message = "Please choose a valid category." });
        }

        if (request.Price.HasValue == false)
        {
            return ServiceResults.BadRequest(new { message = "Price is required." });
        }

        if (request.Price.Value < 0 || request.Price.Value > 9999m)
        {
            return ServiceResults.BadRequest(new { message = "Price must be between 0 and 9999." });
        }

        if (decimal.Round(request.Price.Value, 2) != request.Price.Value)
        {
            return ServiceResults.BadRequest(new { message = "Price can have at most two decimal places." });
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

        await repository.Add(item);
        return ServiceResults.StatusCode(201, ToDto(item));
    }


    public async Task<ServiceResult> Patch(int id, MenuWrite request)
    {
        var item = await repository.Find(id);
        if (item is null)
        {
            return ServiceResults.NotFound(new { message = "Menu item not found." });
        }

        if (request.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return ServiceResults.BadRequest(new { message = "Name cannot be empty." });
            }

            if (request.Name.Trim().Length > 100)
            {
                return ServiceResults.BadRequest(new { message = "Name cannot exceed 100 characters." });
            }

            item.Name = request.Name.Trim();
        }

        if (request.Category is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Category))
            {
                return ServiceResults.BadRequest(new { message = "Category cannot be empty." });
            }

            if (Categories.Contains(request.Category.Trim()) == false)
            {
                return ServiceResults.BadRequest(new { message = "Please choose a valid category." });
            }

            item.Category = request.Category.Trim();
        }

        if (request.Price.HasValue)
        {
            if (request.Price.Value < 0 || request.Price.Value > 9999m)
            {
                return ServiceResults.BadRequest(new { message = "Price must be between 0 and 9999." });
            }

            if (decimal.Round(request.Price.Value, 2) != request.Price.Value)
            {
                return ServiceResults.BadRequest(new { message = "Price can have at most two decimal places." });
            }

            item.Price = request.Price.Value;
        }

        if (request.Description is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Description))
            {
                return ServiceResults.BadRequest(new { message = "Description cannot be empty." });
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

        await repository.Save();
        return ServiceResults.Ok(ToDto(item));
    }


    public async Task<ServiceResult> Delete(int id)
    {
        var item = await repository.Find(id);
        if (item is null)
        {
            return ServiceResults.NotFound(new { message = "Menu item not found." });
        }

        item.IsDeleted = true;
        item.IsAvailable = false;
        await repository.Save();
        return ServiceResults.Ok(new { message = "Menu item deleted." });
    }
}