using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

public class TokenService
{
    public const string Issuer = "DevFood.Api";
    public const string Audience = "DevFood.Web";

    public SymmetricSecurityKey Key { get; }

    public TokenService(IConfiguration config, ILogger<TokenService> log)
    {
        var configured = config[ConfigKeys.JwtKey];
        if (string.IsNullOrWhiteSpace(configured) || configured.Length < 32)
        {
            log.LogWarning("{Key} is not set (or shorter than 32 characters); using a random key for this run.", ConfigKeys.JwtKey);
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
        var lifetime = AuthRules.SessionLifetime;
        if (rememberMe) lifetime = AuthRules.RememberMeLifetime;
        var expires = now.Add(lifetime);
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = Issuer,
            Audience = Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = expires,
            Claims = new Dictionary<string, object>
            {
                [ClaimNames.Subject] = user.Id.ToString(),
                [ClaimNames.Role] = user.Role,
                [ClaimNames.Name] = user.FullName,
                [ClaimNames.TokenId] = Guid.NewGuid().ToString("N")
            },
            SigningCredentials = new SigningCredentials(Key, SecurityAlgorithms.HmacSha256)
        });
        return (token, expires);
    }
}
