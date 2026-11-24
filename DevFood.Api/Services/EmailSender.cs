using System.Net;
using System.Net.Mail;

public class EmailSender(IConfiguration config)
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(config[ConfigKeys.SmtpHost]);

    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        var port = AuthRules.DefaultSmtpPort;
        if (int.TryParse(config[ConfigKeys.SmtpPort], out var configuredPort))
        {
            port = configuredPort;
        }
        using var client = new SmtpClient(config[ConfigKeys.SmtpHost], port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(config[ConfigKeys.SmtpUsername], config[ConfigKeys.SmtpPassword])
        };
        var from = config[ConfigKeys.SmtpFrom] ?? config[ConfigKeys.SmtpUsername] ?? AuthRules.DefaultSender;
        using var message = new MailMessage(from, to, subject, htmlBody) { IsBodyHtml = true };
        await client.SendMailAsync(message);
    }
}
