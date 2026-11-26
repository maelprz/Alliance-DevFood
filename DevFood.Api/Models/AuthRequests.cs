public record RegisterRequest(string? Name, string? Email, string? Password);

public record LoginRequest(string? Email, string? Password);

public record ForgotPasswordRequest(string? Email);

public record ResetPasswordRequest(string? Token, string? NewPassword);
