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
    // seed menu from menuSeed.json + admin account (if Admin:Email/Password are set)
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
                // fix id sequence since we inserted with explicit ids
                await db.Database.ExecuteSqlRawAsync(
                    "SELECT setval(pg_get_serial_sequence('menu_items', 'id'), (SELECT MAX(id) FROM menu_items))");
                log.LogInformation("Seeded {Count} menu items.", seed.Count);
            }

            var adminEmail = app.Configuration[ConfigKeys.AdminEmail]?.Trim().ToLowerInvariant();
            var adminPassword = app.Configuration[ConfigKeys.AdminPassword];
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
                        Role = Roles.Admin
                    });
                    log.LogInformation("Created admin account {Email}.", adminEmail);
                }
                else if (admin.Role != Roles.Admin)
                {
                    admin.Role = Roles.Admin;
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
