public class Coupon
{
    public int Id { get; set; }
    public bool IsDeleted { get; set; }
    public string Code { get; set; } = "";
    public int DiscountPercent { get; set; }
    public decimal MinOrder { get; set; }
    public DateOnly ExpiresAt { get; set; }
}
