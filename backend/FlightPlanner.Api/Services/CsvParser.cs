using System.Globalization;
using System.Text;

namespace FlightPlanner.Api.Services;

internal static class CsvParser
{
    internal static string[] ParseLine(string line)
    {
        var  fields   = new List<string>();
        var  sb       = new StringBuilder();
        bool inQuotes = false;

        foreach (var c in line)
        {
            if (inQuotes)
            {
                if (c == '"') inQuotes = false;
                else          sb.Append(c);
            }
            else
            {
                if      (c == '"') inQuotes = true;
                else if (c == ',') { fields.Add(sb.ToString()); sb.Clear(); }
                else               sb.Append(c);
            }
        }
        fields.Add(sb.ToString());
        return fields.ToArray();
    }

    internal static bool TryParseDouble(string s, out double value) =>
        double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
}
