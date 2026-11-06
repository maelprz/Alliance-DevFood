public class Order
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string CustomerName { get; set; } = "";
    public string Status { get; set; } = "Pending";
    public decimal Subtotal { get; set; }
    public decimal DeliveryFee { get; set; }
    public string? CouponCode { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string DeliveryAddress { get; set; } = "";
    public string PaymentMethod { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<OrderItem> Items { get; set; } = [];
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    // Nullable so deleting a menu item keeps the order history (name/price are snapshotted).
    public int? MenuItemId { get; set; }
    public MenuItem? MenuItem { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int Quantity { get; set; }
}
