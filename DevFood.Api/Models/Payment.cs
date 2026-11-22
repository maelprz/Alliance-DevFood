// Payment for one order (ERD: Order ||--|| Payment). DevFood only takes Cash on
// Delivery, so the status follows the order: Unpaid when placed, Paid when the
// order is Delivered, Voided when it is Cancelled. See OrderService.
public class Payment
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public string PaymentMethod { get; set; } = PaymentMethods.CashOnDelivery;
    public string Status { get; set; } = PaymentStatuses.Unpaid;
}
