using Microsoft.EntityFrameworkCore;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationRead> NotificationReads => Set<NotificationRead>();
    public DbSet<RevokedToken> RevokedTokens => Set<RevokedToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<MenuItem>().HasQueryFilter(item => item.IsDeleted == false);
        b.Entity<Coupon>().HasQueryFilter(coupon => coupon.IsDeleted == false);
        b.Entity<Notification>().HasQueryFilter(notification => notification.IsDeleted == false);
        b.Entity<CartItem>().HasQueryFilter(item => item.MenuItem.IsDeleted == false);
        b.Entity<NotificationRead>().HasQueryFilter(read => read.Notification.IsDeleted == false);

        b.Entity<User>().HasIndex(u => u.Email).IsUnique();
        b.Entity<MenuItem>().Property(m => m.Price).HasPrecision(10, 2);
        b.Entity<CartItem>().HasIndex(c => new { c.UserId, c.MenuItemId }).IsUnique();

        b.Entity<Order>(o =>
        {
            o.Property(order => order.Status).IsConcurrencyToken();
            o.Property(x => x.Subtotal).HasPrecision(10, 2);
            o.Property(x => x.DeliveryFee).HasPrecision(10, 2);
            o.Property(x => x.DiscountAmount).HasPrecision(10, 2);
            o.Property(x => x.TotalAmount).HasPrecision(10, 2);
            o.HasIndex(x => x.UserId);
            // Every order query returns its payment (OrdersController.ToDto reads it).
            o.Navigation(x => x.Payment).AutoInclude();
        });
        b.Entity<Payment>(p =>
        {
            p.HasOne(x => x.Order).WithOne(x => x.Payment)
                .HasForeignKey<Payment>(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
            p.HasIndex(x => x.OrderId).IsUnique();
        });
        b.Entity<OrderItem>(i =>
        {
            i.Property(x => x.Price).HasPrecision(10, 2);
            i.HasOne(x => x.MenuItem).WithMany().OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Coupon>(c =>
        {
            c.HasIndex(x => x.Code).IsUnique();
            c.Property(x => x.MinOrder).HasPrecision(10, 2);
        });

        b.Entity<NotificationRead>().HasKey(r => new { r.NotificationId, r.UserId });

        b.Entity<RevokedToken>().HasKey(r => r.Jti);
        b.Entity<PasswordResetToken>().HasIndex(t => t.TokenHash).IsUnique();
    }
}
