using Microsoft.EntityFrameworkCore;

public class MenuRepository(AppDbContext db)
{
    public Task<List<MenuItem>> GetAll()
    {
        return db.MenuItems.OrderBy(item => item.Id).ToListAsync();
    }

    private IQueryable<MenuItem> FindByCategory(string? category)
    {
        var query = db.MenuItems.AsNoTracking().AsQueryable();
        if (category is not null)
            query = query.Where(item => item.Category == category);
        return query;
    }

    public Task<int> Count(string? category)
    {
        return FindByCategory(category).CountAsync();
    }

    public async Task<List<MenuItem>> GetAdmin(
        string? category, int offset, int limit,
        IEnumerable<string> categoryOrder, bool pinNewest)
    {
        var query = FindByCategory(category);
        var newestId = await query.MaxAsync(item => (int?)item.Id);
        var ordered = query.OrderByDescending(item => pinNewest && item.Id == newestId);
        foreach (var categoryName in categoryOrder)
        {
            ordered = ordered.ThenByDescending(item => item.Category == categoryName);
        }

        return await ordered.ThenByDescending(item => item.Id)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();
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
