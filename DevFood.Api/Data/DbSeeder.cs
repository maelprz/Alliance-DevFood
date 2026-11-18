using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

record MenuSeed(
    [property: JsonPropertyName("food_id")] int FoodId,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("price")] decimal Price,
    [property: JsonPropertyName("category")] string Category,
    [property: JsonPropertyName("availability")] bool Availability,
    [property: JsonPropertyName("image")] string? Image,
    [property: JsonPropertyName("description")] string? Description);

public static class DbSeeder
{
    // Fills an empty menu from Data/menuSeed.json (same ids as the frontend's menuData.json)
    // and creates the admin account when Admin:Email / Admin:Password are configured.
    public static async Task SeedAsync(WebApplication app)
    {
        var log = app.Logger;
        if (string.IsNullOrWhiteSpace(app.Configuration.GetConnectionString("Default")))
        {
            log.LogWarning("ConnectionStrings:Default is not set; skipping database seeding.");
            return;
        }

        try
        {
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            if (!await db.MenuItems.IgnoreQueryFilters().AnyAsync())
            {
                var path = Path.Combine(AppContext.BaseDirectory, "Data", "menuSeed.json");
                var seed = JsonSerializer.Deserialize<List<MenuSeed>>(await File.ReadAllTextAsync(path)) ?? [];
                db.MenuItems.AddRange(seed.Select(s => new MenuItem
                {
                    Id = s.FoodId,
                    Name = s.Name,
                    Price = s.Price,
                    Category = s.Category,
                    IsAvailable = s.Availability,
                    ImageUrl = s.Image,
                    Description = s.Description ?? ""
                }));
                await db.SaveChangesAsync();
                // Explicit ids don't advance the identity sequence; move it past them.
                await db.Database.ExecuteSqlRawAsync(
                    "SELECT setval(pg_get_serial_sequence('menu_items', 'id'), (SELECT MAX(id) FROM menu_items))");
                log.LogInformation("Seeded {Count} menu items.", seed.Count);
            }

            var adminEmail = app.Configuration["Admin:Email"]?.Trim().ToLowerInvariant();
            var adminPassword = app.Configuration["Admin:Password"];
            if (!string.IsNullOrEmpty(adminEmail) && !string.IsNullOrEmpty(adminPassword))
            {
                var admin = await db.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);
                if (admin is null)
                {
                    db.Users.Add(new User
                    {
                        FullName = "Administrator",
                        Email = adminEmail,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                        Role = "admin"
                    });
                    log.LogInformation("Created admin account {Email}.", adminEmail);
                }
                else if (admin.Role != "admin")
                {
                    admin.Role = "admin";
                    log.LogInformation("Promoted {Email} to admin.", adminEmail);
                }
                await db.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Database seeding failed; the API will keep running. Is the database migrated and reachable?");
        }
    }
}
