using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

// Issues the JWTs returned by /api/auth/login and holds the key used to validate them.
public class TokenService
{
    public const string Issuer = "DevFood.Api";
    public const string Audience = "DevFood.Web";
    static readonly TimeSpan SessionLifetime = TimeSpan.FromHours(8);
    static readonly TimeSpan RememberMeLifetime = TimeSpan.FromDays(30);

    public SymmetricSecurityKey Key { get; }

    public TokenService(IConfiguration config, ILogger<TokenService> log)
    {
        var configured = config["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(configured) || configured.Length < 32)
        {
            // Fine for local development, but every API restart logs everyone out.
            log.LogWarning("Jwt:Key is not set (or shorter than 32 characters); using a random key for this run.");
            Key = new SymmetricSecurityKey(RandomNumberGenerator.GetBytes(64));
        }
        else
        {
            Key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configured));
        }
    }

    public (string Token, DateTime ExpiresAt) Issue(User user, bool rememberMe)
    {
        var now = DateTime.UtcNow;
        var expires = now.Add(rememberMe ? RememberMeLifetime : SessionLifetime);
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = Issuer,
            Audience = Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = expires,
            Claims = new Dictionary<string, object>
            {
                ["sub"] = user.Id.ToString(),
                ["role"] = user.Role,
                ["name"] = user.FullName,
                ["jti"] = Guid.NewGuid().ToString("N")
            },
            SigningCredentials = new SigningCredentials(Key, SecurityAlgorithms.HmacSha256)
        });
        return (token, expires);
    }
}
