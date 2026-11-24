using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
     .UseSnakeCaseNamingConvention());

builder.Services.AddScoped<MenuRepository>();
builder.Services.AddScoped<AdminOrdersRepository>();
builder.Services.AddScoped<AdminStatisticsRepository>();
builder.Services.AddScoped<CartRepository>();
builder.Services.AddScoped<CartService>();
builder.Services.AddScoped<CouponRepository>();
builder.Services.AddScoped<CouponService>();
builder.Services.AddScoped<AdminCouponsService>();
builder.Services.AddScoped<MenuService>();
builder.Services.AddScoped<AdminOrdersService>();
builder.Services.AddScoped<AdminStatisticsService>();
builder.Services.AddScoped<OrderRepository>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddHostedService<OrderAutoAcceptService>();
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<AuthTokenRepository>();
builder.Services.AddScoped<NotificationRepository>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddHostedService<NotificationCleanupService>();

builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<EmailSender>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<TokenService>((o, tokens) =>
    {
        // Keep claim names as issued ("sub", "role", "jti") instead of mapping to long URIs.
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = TokenService.Issuer,
            ValidAudience = TokenService.Audience,
            IssuerSigningKey = tokens.Key,
            NameClaimType = ClaimNames.Subject,
            RoleClaimType = ClaimNames.Role,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        o.Events = new JwtBearerEvents
        {
            // A valid signature isn't enough: reject logged-out tokens, deactivated
            // users, and sessions older than the user's last password reset.
            // RBAC: the role and its permissions come from the database on every request,
            // so changing a user's role (or a role's permissions) applies immediately.
            OnTokenValidated = async ctx =>
            {
                var auth = ctx.HttpContext.RequestServices.GetRequiredService<AuthService>();
                var session = await auth.CheckSession(
                    ctx.Principal?.UserId(),
                    ctx.Principal?.FindFirst(ClaimNames.TokenId)?.Value,
                    ctx.SecurityToken.ValidFrom);
                if (session is null)
                {
                    ctx.Fail("Session is no longer valid.");
                    return;
                }

                var identity = (ClaimsIdentity)ctx.Principal!.Identity!;
                foreach (var stale in identity.FindAll(ClaimNames.Role).ToList()) identity.RemoveClaim(stale);
                identity.AddClaim(new Claim(ClaimNames.Role, session.Role));
                foreach (var permission in session.Permissions)
                    identity.AddClaim(new Claim(Permissions.ClaimType, permission));
            },
            OnChallenge = async ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await ctx.Response.WriteAsJsonAsync(new { message = AuthMessages.SessionExpired });
            },
            OnForbidden = async ctx =>
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                await ctx.Response.WriteAsJsonAsync(new { message = AuthMessages.NoPermission });
            }
        };
    });
// One policy per permission, e.g. [Authorize(Policy = Permissions.UsersView)].
builder.Services.AddAuthorization(o =>
{
    foreach (var permission in Permissions.All)
        o.AddPolicy(permission, p => p.RequireClaim(Permissions.ClaimType, permission));
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();   // off in development so the Vite proxy (http) works

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

await DbSeeder.SeedAsync(app);

app.Run();
