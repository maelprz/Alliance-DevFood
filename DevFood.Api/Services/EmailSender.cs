using System.Net;
using System.Net.Mail;

public class EmailSender(IConfiguration config)
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(config["Smtp:Host"]);

    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        var port = 587;
        if (int.TryParse(config["Smtp:Port"], out var configuredPort))
        {
            port = configuredPort;
        }
        using var client = new SmtpClient(config["Smtp:Host"], port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(config["Smtp:Username"], config["Smtp:Password"])
        };
        var from = config["Smtp:From"] ?? config["Smtp:Username"] ?? "no-reply@devfood.local";
        using var message = new MailMessage(from, to, subject, htmlBody) { IsBodyHtml = true };
        await client.SendMailAsync(message);
    }
}
