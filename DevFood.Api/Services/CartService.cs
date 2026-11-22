public class CartService(CartRepository repository)
{
    const int MaxQuantity = 99;

    public async Task<ServiceResult> GetAsync(int? userId)
    {
        if (userId is null) return ServiceResults.Unauthorized();
        return ServiceResults.Ok(await LoadAsync(userId.Value));
    }

    public async Task<ServiceResult> SaveAsync(int? userId, CartPut request)
    {
        if (userId is null) return ServiceResults.Unauthorized();
        if (request.Items is null || request.Items.Any(line => line is null))
            return ServiceResults.BadRequest(new { message = "items must be an array of cart lines." });

        var quantities = request.Items.OfType<CartLine>()
            .Where(line => line.Quantity > 0)
            .GroupBy(line => line.FoodId)
            .ToDictionary(group => group.Key, group => (int)Math.Min(group.Sum(line => (long)line.Quantity), MaxQuantity));

        await using var transaction = await repository.BeginTransactionAsync();
        await repository.LockUserAsync(userId.Value);
        var validIds = await repository.GetMenuItemIdsAsync(quantities.Keys.ToArray());
        var existing = await repository.LoadForUpdateAsync(userId.Value);

        var removed = new List<CartItem>();
        foreach (var item in existing)
        {
            if (validIds.Contains(item.MenuItemId))
                item.Quantity = quantities[item.MenuItemId];
            else
                removed.Add(item);

            quantities.Remove(item.MenuItemId);
        }

        repository.RemoveRange(removed);
        repository.AddRange(quantities
            .Where(line => validIds.Contains(line.Key))
            .Select(line => new CartItem { UserId = userId.Value, MenuItemId = line.Key, Quantity = line.Value }));

        await repository.SaveAsync();
        var cart = await LoadAsync(userId.Value);
        await transaction.CommitAsync();
        return ServiceResults.Ok(cart);
    }

    public async Task ClearAsync(int userId)
    {
        await repository.DeleteByUserAsync(userId);
    }

    private async Task<object> LoadAsync(int userId)
    {
        var items = await repository.ListAsync(userId);
        return new
        {
            user_id = userId,
            items = items.Select(item => new
            {
                food_id = item.MenuItemId,
                name = item.MenuItem.Name,
                price = item.MenuItem.Price,
                category = item.MenuItem.Category,
                image = item.MenuItem.ImageUrl,
                description = item.MenuItem.Description,
                availability = item.MenuItem.IsAvailable,
                quantity = item.Quantity
            })
        };
    }
}
