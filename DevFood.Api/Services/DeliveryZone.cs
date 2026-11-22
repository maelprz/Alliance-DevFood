// Grab-style delivery zone: the store location and the farthest distance a
// rider will go. Values come from the "Delivery" section of appsettings.json,
// so they can change without touching code. Keep them in sync with
// src/constants/delivery.js, which draws the same zone on the checkout map.
// Delivery fee by distance: BaseFee covers the first BaseKm, then PerKm for
// each extra km or part of one (₱39 + ₱8/km → ₱79 at the 7 km limit).
public record DeliveryZone(
    string StoreName, double StoreLat, double StoreLng, double MaxKm,
    decimal BaseFee, double BaseKm, decimal PerKm)
{
    public static DeliveryZone From(IConfiguration config)
    {
        var s = config.GetSection("Delivery");
        return new DeliveryZone(
            s["StoreName"] ?? "DevFood Kitchen",
            s.GetValue("StoreLat", 10.2951),
            s.GetValue("StoreLng", 123.8973),
            s.GetValue("MaxKm", 7.0),
            s.GetValue("BaseFee", 39m),
            s.GetValue("BaseKm", 2.0),
            s.GetValue("PerKm", 8m));
    }

    // Fee for a straight-line distance from the store. The distance is rounded
    // to 0.1 km first, the same way the checkout page does, so both agree.
    public decimal FeeFor(double km)
    {
        var rounded = Math.Round(km, 1, MidpointRounding.AwayFromZero);
        var extraKm = Math.Max(0, Math.Ceiling(Math.Round(rounded - BaseKm, 1)));
        return BaseFee + (decimal)extraKm * PerKm;
    }

    // Straight-line (haversine) distance from the store, in kilometres.
    public double DistanceKm(double lat, double lng)
    {
        static double Rad(double d) => d * Math.PI / 180;
        var dLat = Rad(lat - StoreLat);
        var dLng = Rad(lng - StoreLng);
        var h = Math.Pow(Math.Sin(dLat / 2), 2)
              + Math.Cos(Rad(StoreLat)) * Math.Cos(Rad(lat)) * Math.Pow(Math.Sin(dLng / 2), 2);
        return 2 * 6371 * Math.Asin(Math.Sqrt(h));
    }
}
