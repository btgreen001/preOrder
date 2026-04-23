namespace OrderMgmt.DTOs;

public class UnitConversionDto
{
    public Guid ExternalId { get; set; }
    public Guid? OrganizationGuid { get; set; }
    public string FromUnit { get; set; } = string.Empty;
    public string ToUnit { get; set; } = string.Empty;
    public decimal ConversionFactor { get; set; }
    public string? Category { get; set; }
    public bool IsActive { get; set; }
    public int VersionNbr { get; set; }
}

public class ConvertUnitRequest
{
    public decimal Value { get; set; }
    public string FromUnit { get; set; } = string.Empty;
    public string ToUnit { get; set; } = string.Empty;
    public string? Category { get; set; }
    public Guid? InventoryItemExternalId { get; set; }
}

public class ConvertUnitResponse
{
    public decimal OriginalValue { get; set; }
    public string FromUnit { get; set; } = string.Empty;
    public decimal ConvertedValue { get; set; }
    public string ToUnit { get; set; } = string.Empty;
    public decimal AppliedFactor { get; set; }
    public bool UsedOrganizationOverride { get; set; }
    public bool UsedReverseConversion { get; set; }
}

public class UpsertUnitConversionRequest
{
    public string FromUnit { get; set; } = string.Empty;
    public string ToUnit { get; set; } = string.Empty;
    public decimal ConversionFactor { get; set; }
    public string? Category { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ScaleQuantityRequest
{
    public decimal Value { get; set; }
    public decimal Multiplier { get; set; }
}

public class ScaleQuantityResponse
{
    public decimal OriginalValue { get; set; }
    public decimal Multiplier { get; set; }
    public decimal ScaledValue { get; set; }
}

public class ParseFractionRequest
{
    public string Input { get; set; } = string.Empty;
}

public class ParseFractionResponse
{
    public string Input { get; set; } = string.Empty;
    public decimal DecimalValue { get; set; }
}

public class FormatFractionRequest
{
    public decimal Value { get; set; }
    public int MaxDenominator { get; set; } = 16;
}

public class FormatFractionResponse
{
    public decimal Value { get; set; }
    public string FractionDisplay { get; set; } = string.Empty;
}
