using Microsoft.EntityFrameworkCore;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationRead> NotificationReads => Set<NotificationRead>();
    public DbSet<RevokedToken> RevokedTokens => Set<RevokedToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>().HasIndex(u => u.Email).IsUnique();
        b.Entity<MenuItem>().Property(m => m.Price).HasPrecision(10, 2);
        b.Entity<CartItem>().HasIndex(c => new { c.UserId, c.MenuItemId }).IsUnique();

        b.Entity<Order>(o =>
        {
            o.Property(x => x.Subtotal).HasPrecision(10, 2);
            o.Property(x => x.DeliveryFee).HasPrecision(10, 2);
            o.Property(x => x.DiscountAmount).HasPrecision(10, 2);
            o.Property(x => x.TotalAmount).HasPrecision(10, 2);
            o.HasIndex(x => x.UserId);
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
