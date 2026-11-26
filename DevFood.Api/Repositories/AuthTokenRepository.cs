using Microsoft.EntityFrameworkCore;

// revoked tokens + reset links. nothing is deleted, used links just get UsedAt
public class AuthTokenRepository(AppDbContext db)
{
    public async Task AddRevoked(RevokedToken token)
    {
        db.RevokedTokens.Add(token);
        await db.SaveChangesAsync();
    }

    public Task<bool> HasResetSince(int userId, DateTime since)
    {
        return db.PasswordResetTokens.AnyAsync(t => t.UserId == userId && t.CreatedAt > since);
    }

    public async Task AddReset(PasswordResetToken token)
    {
        db.PasswordResetTokens.Add(token);
        await db.SaveChangesAsync();
    }

    public Task<PasswordResetToken?> FindReset(string tokenHash)
    {
        return db.PasswordResetTokens.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == tokenHash);
    }

    public async Task MarkResetsUsed(int userId, DateTime usedAt)
    {
        await db.PasswordResetTokens
            .Where(t => t.UserId == userId && t.UsedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.UsedAt, usedAt));
    }

    public async Task Save()
    {
        await db.SaveChangesAsync();
    }
}
