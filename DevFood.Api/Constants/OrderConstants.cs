// Fixed values for orders and payments, so the same words are never typed
// twice. The values are what is stored in the database — do not rename them.

public static class OrderStatuses
{
    public const string Pending = "Pending";
    public const string Preparing = "Preparing";
    public const string Ready = "Ready";
    public const string Delivered = "Delivered";
    public const string Cancelled = "Cancelled";

    // Delivered and Cancelled end an order; anything else is still in progress.
    public static bool IsFinal(string status) => status == Delivered || status == Cancelled;
}

public static class PaymentStatuses
{
    public const string Unpaid = "Unpaid";
    public const string Paid = "Paid";
    public const string Voided = "Voided";
}

public static class PaymentMethods
{
    // Cash on Delivery only (GCash and card were removed).
    public const string CashOnDelivery = "cod";

    public static readonly string[] All = [CashOnDelivery];
}

public static class NotificationTypes
{
    public const string OrderConfirmed = "order_confirmed";
    // Same type AdminOrdersService uses when the admin changes a status.
    public const string OrderStatus = "order_status";
}

public static class NotificationAudiences
{
    public const string User = "user";
}

public static class OrderRules
{
    // After placing, the customer can cancel for this long. When it ends the
    // kitchen accepts the order automatically (Pending -> Preparing).
    public const int CancelWindowSeconds = 30;

    // How often the auto-accept job looks for orders whose window has ended.
    public const int AutoAcceptCheckSeconds = 2;

    // Auto-accept only looks at orders placed this recently. Older Pending
    // orders (left over or forgotten) stay Pending for the admin to handle.
    public const int AutoAcceptMaxAgeMinutes = 10;
}
