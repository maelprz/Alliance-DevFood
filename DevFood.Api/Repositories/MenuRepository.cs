using Microsoft.EntityFrameworkCore;

public record MenuPage(List<MenuItem> Items, int Total, int Page, int TotalPages);

public class MenuRepository(AppDbContext db)
{
    public Task<List<MenuItem>> GetAll()
    {
        return db.MenuItems.OrderBy(item => item.Id).ToListAsync();
    }

    public async Task<MenuPage> GetAdmin(string? category, int page)
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
        var newestId = await query.MaxAsync(item => (int?)item.Id);
        var items = await query
            .OrderByDescending(item => item.Id == newestId)
            .ThenByDescending(item => item.Category == MenuCategories.Burger)
            .ThenByDescending(item => item.Category == MenuCategories.Sandwich)
            .ThenByDescending(item => item.Category == MenuCategories.Chicken)
            .ThenByDescending(item => item.Category == MenuCategories.Pizzas)
            .ThenByDescending(item => item.Category == MenuCategories.RiceMeals)
            .ThenByDescending(item => item.Category == MenuCategories.Snacks)
            .ThenByDescending(item => item.Category == MenuCategories.Spaghetti)
            .ThenByDescending(item => item.Category == MenuCategories.Dessert)
            .ThenByDescending(item => item.Category == MenuCategories.Drinks)
            .ThenByDescending(item => item.Id)
            .Skip((currentPage - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new MenuPage(items, total, currentPage, totalPages);
    }

    public async Task<MenuItem?> Find(int id)
    {
        return await db.MenuItems.FindAsync(id);
    }

    public async Task Add(MenuItem item)
    {
        db.MenuItems.Add(item);
        await db.SaveChangesAsync();
    }

    public async Task Save()
    {
        await db.SaveChangesAsync();
    }
}
