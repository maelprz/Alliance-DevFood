public record UserPatch(
    string? Name,
    string? Email,
    string? Phone,
    string? AddressStreet,
    string? AddressCity,
    string? AddressZip,
    string? CurrentPassword,
    string? NewPassword);
