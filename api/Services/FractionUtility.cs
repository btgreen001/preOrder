using System.Globalization;

namespace PreOrderApp.Services;

public static class FractionUtility
{
    public static decimal ParseToDecimal(string input)
    {
        var value = (input ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Input is required.");
        }

        if (decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var decimalValue))
        {
            return decimalValue;
        }

        var wholeAndFractionParts = value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (wholeAndFractionParts.Length == 2)
        {
            if (!decimal.TryParse(wholeAndFractionParts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var whole))
            {
                throw new ArgumentException($"Invalid whole number in fraction input '{input}'.");
            }

            var fractionPart = ParseFractionPart(wholeAndFractionParts[1], input);
            return whole + fractionPart;
        }

        if (wholeAndFractionParts.Length == 1 && value.Contains('/'))
        {
            return ParseFractionPart(value, input);
        }

        throw new ArgumentException($"Invalid fraction input '{input}'. Use formats like 1/2, 1 1/2, or 0.5.");
    }

    public static string FormatFromDecimal(decimal value, int maxDenominator = 16)
    {
        if (maxDenominator < 2)
        {
            maxDenominator = 2;
        }

        var sign = value < 0 ? "-" : string.Empty;
        var absoluteValue = Math.Abs(value);

        var whole = (int)Math.Floor(absoluteValue);
        var fractional = absoluteValue - whole;

        if (fractional == 0)
        {
            return $"{sign}{whole}";
        }

        var (numerator, denominator) = ApproximateFraction(fractional, maxDenominator);

        if (numerator == 0)
        {
            return $"{sign}{whole}";
        }

        if (whole == 0)
        {
            return $"{sign}{numerator}/{denominator}";
        }

        return $"{sign}{whole} {numerator}/{denominator}";
    }

    private static decimal ParseFractionPart(string fractionInput, string originalInput)
    {
        var slashParts = fractionInput.Split('/');
        if (slashParts.Length != 2)
        {
            throw new ArgumentException($"Invalid fraction input '{originalInput}'.");
        }

        if (!decimal.TryParse(slashParts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var numerator))
        {
            throw new ArgumentException($"Invalid numerator in '{originalInput}'.");
        }

        if (!decimal.TryParse(slashParts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var denominator))
        {
            throw new ArgumentException($"Invalid denominator in '{originalInput}'.");
        }

        if (denominator == 0)
        {
            throw new ArgumentException("Denominator cannot be zero.");
        }

        return numerator / denominator;
    }

    private static (int numerator, int denominator) ApproximateFraction(decimal value, int maxDenominator)
    {
        var bestNumerator = 0;
        var bestDenominator = 1;
        var smallestError = decimal.MaxValue;

        for (var denominator = 1; denominator <= maxDenominator; denominator++)
        {
            var numerator = (int)Math.Round(value * denominator, MidpointRounding.AwayFromZero);
            var approximation = (decimal)numerator / denominator;
            var error = Math.Abs(value - approximation);

            if (error < smallestError)
            {
                smallestError = error;
                bestNumerator = numerator;
                bestDenominator = denominator;
            }
        }

        var gcd = GreatestCommonDivisor(Math.Abs(bestNumerator), bestDenominator);
        return (bestNumerator / gcd, bestDenominator / gcd);
    }

    private static int GreatestCommonDivisor(int a, int b)
    {
        while (b != 0)
        {
            var temp = b;
            b = a % b;
            a = temp;
        }

        return a == 0 ? 1 : a;
    }
}
