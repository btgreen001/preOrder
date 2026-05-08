using System.Data;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.DTOs;
using PreOrderApp.Models;

namespace PreOrderApp.Services;

public interface IUnitConversionService
{
    Task<List<UnitConversionDto>> GetConversionsAsync(Guid organizationGuidId, bool includeGlobal, string? category);
    Task<ConvertUnitResponse> ConvertAsync(Guid organizationGuidId, ConvertUnitRequest request);
    Task<ScaleQuantityResponse> ScaleAsync(ScaleQuantityRequest request);
    Task<ParseFractionResponse> ParseFractionAsync(ParseFractionRequest request);
    Task<FormatFractionResponse> FormatFractionAsync(FormatFractionRequest request);
    Task<UnitConversionDto> UpsertOrganizationConversionAsync(Guid organizationGuidId, Guid userId, UpsertUnitConversionRequest request);
    Task<UnitConversionDto> UpsertGlobalConversionAsync(Guid userId, UpsertUnitConversionRequest request);
    Task<bool> DeactivateConversionAsync(Guid externalId, Guid organizationGuidId, Guid userId, bool isSystemAdmin);
}

public class UnitConversionService : IUnitConversionService
{
    private readonly AppDbContext _context;
    private readonly ILogger<UnitConversionService> _logger;

    private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "count",
        "weight",
        "volume"
    };

    private static readonly Dictionary<string, HashSet<string>> UnitsByCategory = new(StringComparer.OrdinalIgnoreCase)
    {
        ["weight"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "mg", "g", "kg", "ton", "oz", "lb"
        },
        // Canonical volume units are t/T/c/mL/L.
        // Keep legacy tokens for compatibility, but treat volume units case-sensitively so T != t.
        ["volume"] = new HashSet<string>(StringComparer.Ordinal)
        {
            "t", "T", "c", "mL", "L",
            "tsp", "tbsp", "ml", "l", "C", "fl oz", "pt", "qt", "gal", "pinch"
        },
        ["count"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "each", "dozen", "baker's dozen"
        }
    };

    public UnitConversionService(AppDbContext context, ILogger<UnitConversionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<UnitConversionDto>> GetConversionsAsync(Guid organizationGuidId, bool includeGlobal, string? category)
    {
        var organizationId = await ResolveOrganizationNumericIdAsync(organizationGuidId);

        var query = _context.UnitConversions
            .AsNoTracking()
            .Where(x => x.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalizedCategory = category.Trim().ToLowerInvariant();
            query = query.Where(x => x.Category != null && x.Category.ToLower() == normalizedCategory);
        }

        if (includeGlobal)
        {
            query = query.Where(x => x.OrganizationId == organizationId || x.OrganizationId == null);
        }
        else
        {
            query = query.Where(x => x.OrganizationId == organizationId);
        }

        return await query
            .OrderByDescending(x => x.OrganizationId.HasValue)
            .ThenBy(x => x.Category)
            .ThenBy(x => x.FromUnit)
            .ThenBy(x => x.ToUnit)
            .Select(x => new UnitConversionDto
            {
                ExternalId = x.ExternalId,
                OrganizationGuid = x.OrganizationId.HasValue ? organizationGuidId : null,
                FromUnit = x.FromUnit,
                ToUnit = x.ToUnit,
                ConversionFactor = x.ConversionFactor,
                Category = x.Category,
                IsActive = x.IsActive,
                VersionNbr = x.VersionNbr
            })
            .ToListAsync();
    }

    public async Task<ConvertUnitResponse> ConvertAsync(Guid organizationGuidId, ConvertUnitRequest request)
    {
        if (request.Value < 0)
        {
            throw new ArgumentException("Value cannot be negative.");
        }

        var fromUnit = NormalizeUnit(request.FromUnit);
        var toUnit = NormalizeUnit(request.ToUnit);

        if (string.IsNullOrWhiteSpace(fromUnit) || string.IsNullOrWhiteSpace(toUnit))
        {
            throw new ArgumentException("FromUnit and ToUnit are required.");
        }

        if (fromUnit == toUnit)
        {
            return new ConvertUnitResponse
            {
                OriginalValue = request.Value,
                FromUnit = fromUnit,
                ConvertedValue = request.Value,
                ToUnit = toUnit,
                AppliedFactor = 1,
                UsedOrganizationOverride = false,
                UsedReverseConversion = false
            };
        }

        var organizationId = await ResolveOrganizationNumericIdAsync(organizationGuidId);
        var category = NormalizeCategory(request.Category);

        var direct = await FindBestConversionAsync(organizationId, fromUnit, toUnit, category);
        if (direct != null)
        {
            return new ConvertUnitResponse
            {
                OriginalValue = request.Value,
                FromUnit = fromUnit,
                ConvertedValue = request.Value * direct.ConversionFactor,
                ToUnit = toUnit,
                AppliedFactor = direct.ConversionFactor,
                UsedOrganizationOverride = direct.OrganizationId.HasValue,
                UsedReverseConversion = false
            };
        }

        var reverse = await FindBestConversionAsync(organizationId, toUnit, fromUnit, category);
        if (reverse != null)
        {
            if (reverse.ConversionFactor == 0)
            {
                throw new InvalidOperationException("Reverse conversion factor cannot be zero.");
            }

            var factor = 1 / reverse.ConversionFactor;
            return new ConvertUnitResponse
            {
                OriginalValue = request.Value,
                FromUnit = fromUnit,
                ConvertedValue = request.Value * factor,
                ToUnit = toUnit,
                AppliedFactor = factor,
                UsedOrganizationOverride = reverse.OrganizationId.HasValue,
                UsedReverseConversion = true
            };
        }

        var chained = await TryConvertViaPathAsync(organizationId, fromUnit, toUnit, category);
        if (chained != null)
        {
            return new ConvertUnitResponse
            {
                OriginalValue = request.Value,
                FromUnit = fromUnit,
                ConvertedValue = request.Value * chained.Value.Factor,
                ToUnit = toUnit,
                AppliedFactor = chained.Value.Factor,
                UsedOrganizationOverride = chained.Value.UsedOrganizationOverride,
                UsedReverseConversion = false
            };
        }

        var densityFallback = await TryConvertUsingItemDensityAsync(
            organizationGuidId,
            organizationId,
            request.Value,
            fromUnit,
            toUnit,
            request.InventoryItemExternalId);

        if (densityFallback != null)
        {
            return densityFallback;
        }

        throw new InvalidOperationException($"No conversion exists for '{fromUnit}' -> '{toUnit}'.");
    }

    public Task<ScaleQuantityResponse> ScaleAsync(ScaleQuantityRequest request)
    {
        if (request.Multiplier <= 0)
        {
            throw new ArgumentException("Multiplier must be greater than zero.");
        }

        return Task.FromResult(new ScaleQuantityResponse
        {
            OriginalValue = request.Value,
            Multiplier = request.Multiplier,
            ScaledValue = request.Value * request.Multiplier
        });
    }

    public Task<ParseFractionResponse> ParseFractionAsync(ParseFractionRequest request)
    {
        var decimalValue = FractionUtility.ParseToDecimal(request.Input);
        return Task.FromResult(new ParseFractionResponse
        {
            Input = request.Input,
            DecimalValue = decimalValue
        });
    }

    public Task<FormatFractionResponse> FormatFractionAsync(FormatFractionRequest request)
    {
        var display = FractionUtility.FormatFromDecimal(request.Value, request.MaxDenominator);
        return Task.FromResult(new FormatFractionResponse
        {
            Value = request.Value,
            FractionDisplay = display
        });
    }

    public async Task<UnitConversionDto> UpsertOrganizationConversionAsync(Guid organizationGuidId, Guid userId, UpsertUnitConversionRequest request)
    {
        var organizationId = await ResolveOrganizationNumericIdAsync(organizationGuidId);
        if (!organizationId.HasValue)
        {
            throw new InvalidOperationException("Organization not found. Ensure organization exists and is correct.");
        }

        return await UpsertAsync(organizationId, organizationGuidId, userId, request);
    }

    public Task<UnitConversionDto> UpsertGlobalConversionAsync(Guid userId, UpsertUnitConversionRequest request)
    {
        return UpsertAsync(null, null, userId, request);
    }

    public async Task<bool> DeactivateConversionAsync(Guid externalId, Guid organizationGuidId, Guid userId, bool isSystemAdmin)
    {
        var organizationId = await ResolveOrganizationNumericIdAsync(organizationGuidId);

        var conversion = await _context.UnitConversions
            .FirstOrDefaultAsync(x => x.ExternalId == externalId && x.IsActive);

        if (conversion == null)
        {
            return false;
        }

        if (!conversion.OrganizationId.HasValue && !isSystemAdmin)
        {
            throw new UnauthorizedAccessException("Only SystemAdmin can deactivate global conversions.");
        }

        if (conversion.OrganizationId.HasValue && conversion.OrganizationId != organizationId)
        {
            return false;
        }

        conversion.IsActive = false;
        conversion.UpdatedBy = userId;
        conversion.UpdatedAt = DateTime.UtcNow;
        conversion.VersionNbr += 1;

        await _context.SaveChangesAsync();
        return true;
    }


    private async Task<UnitConversionDto> UpsertAsync(long? organizationId, Guid? organizationGuidId, Guid userId, UpsertUnitConversionRequest request)
    {
        var fromUnit = NormalizeUnit(request.FromUnit);
        var toUnit = NormalizeUnit(request.ToUnit);
        var category = NormalizeCategory(request.Category);
        var conversionFactor = request.ConversionFactor;

        if (string.IsNullOrWhiteSpace(fromUnit) || string.IsNullOrWhiteSpace(toUnit))
        {
            throw new ArgumentException("FromUnit and ToUnit are required.");
        }

        if (conversionFactor <= 0)
        {
            throw new ArgumentException("ConversionFactor must be greater than zero.");
        }

        if (category is null || !AllowedCategories.Contains(category))
        {
            throw new ArgumentException("Category must be one of: count, weight, volume.");
        }

        if (!UnitsByCategory.TryGetValue(category, out var allowedUnits))
        {
            throw new ArgumentException("Category must be one of: count, weight, volume.");
        }

        if (!allowedUnits.Contains(fromUnit) || !allowedUnits.Contains(toUnit))
        {
            throw new ArgumentException($"FromUnit and ToUnit must both belong to category '{category}'.");
        }

        UnitConversion? activeGlobal = null;
        UnitConversion? activeGlobalReverse = null;
        UnitConversion? matchGlobal = null;

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            if (organizationId.HasValue)
            {
                activeGlobal = await _context.UnitConversions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.OrganizationId == null
                                        && x.FromUnit == fromUnit
                                        && x.ToUnit == toUnit
                                        && x.IsActive);

                activeGlobalReverse = await _context.UnitConversions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.OrganizationId == null
                                        && x.FromUnit == toUnit
                                        && x.ToUnit == fromUnit
                                        && x.IsActive);
            }

            var existing = await _context.UnitConversions
                .FirstOrDefaultAsync(x => x.OrganizationId == organizationId
                                    && x.FromUnit == fromUnit
                                    && x.ToUnit == toUnit);

            var matchesGlobal = false;
            var matchesReverseGlobal = false;

            // They are trying to update an organization override - if the override matches a global then we will not Upsert.
            // if there is an existing we will deactivate it.
            if (organizationId.HasValue)
            {
                if (activeGlobal != null)
                {
                    matchesGlobal = FactorsMatch(activeGlobal.ConversionFactor, conversionFactor)
                                    && CategoriesMatch(activeGlobal.Category, category)
                                    && request.IsActive;
                    if (matchesGlobal)
                    {
                        matchGlobal = activeGlobal;
                    }
                }
                if (activeGlobalReverse != null && activeGlobal == null)
                {
                    var reverseFactor = 1m / activeGlobalReverse.ConversionFactor;
                    matchesReverseGlobal = FactorsMatch(reverseFactor, conversionFactor)
                                            && CategoriesMatch(activeGlobalReverse.Category, category)
                                            && request.IsActive;
                    if (matchesReverseGlobal)
                    {
                        matchGlobal = activeGlobalReverse;
                    }
                }

                if (matchGlobal != null)
                {
                    if (existing != null && existing.IsActive)
                    {
                        existing.IsActive = false;
                        existing.UpdatedBy = userId;
                        existing.UpdatedAt = DateTime.UtcNow;
                        existing.VersionNbr += 1;
                    }

                    if (_context.ChangeTracker.HasChanges())
                    {
                        await _context.SaveChangesAsync();
                    }

                    await transaction.CommitAsync();
                    return new UnitConversionDto
                    {
                        ExternalId = matchGlobal.ExternalId,
                        OrganizationGuid = null,
                        FromUnit = matchGlobal.FromUnit,
                        ToUnit = matchGlobal.ToUnit,
                        ConversionFactor = matchGlobal.ConversionFactor,
                        Category = matchGlobal.Category,
                        IsActive = matchGlobal.IsActive,
                        VersionNbr = matchGlobal.VersionNbr
                    };
                }
            }

            if (existing == null)
            {
                existing = new UnitConversion
                {
                    OrganizationId = organizationId,
                    FromUnit = fromUnit,
                    ToUnit = toUnit,
                    ConversionFactor = request.ConversionFactor,
                    Category = category,
                    IsActive = request.IsActive,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    CreatedBy = userId,
                    UpdatedBy = userId,
                    VersionNbr = 1
                };

                _context.UnitConversions.Add(existing);
            }
            else
            {
                existing.ConversionFactor = request.ConversionFactor;
                existing.Category = category;
                existing.IsActive = request.IsActive;
                existing.UpdatedBy = userId;
                existing.UpdatedAt = DateTime.UtcNow;
                existing.VersionNbr += 1;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new UnitConversionDto
            {
                ExternalId = existing.ExternalId,
                OrganizationGuid = organizationGuidId,
                FromUnit = existing.FromUnit,
                ToUnit = existing.ToUnit,
                ConversionFactor = existing.ConversionFactor,
                Category = existing.Category,
                IsActive = existing.IsActive,
                VersionNbr = existing.VersionNbr
            };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error upserting unit conversion for org {OrganizationId}, transaction rolled back", organizationGuidId);
            throw;
        }
    }

    private async Task<UnitConversion?> FindBestConversionAsync(long? organizationId, string fromUnit, string toUnit, string? category)
    {
        var fromAliases = ExpandUnitAliasesForLookup(fromUnit);
        var toAliases = ExpandUnitAliasesForLookup(toUnit);

        var query = _context.UnitConversions
            .AsNoTracking()
            .Where(x => x.IsActive
                     && fromAliases.Contains(x.FromUnit)
                     && toAliases.Contains(x.ToUnit));

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(x => x.Category == category);
        }

        if (organizationId.HasValue)
        {
            query = query.Where(x => x.OrganizationId == organizationId || x.OrganizationId == null);
        }
        else
        {
            query = query.Where(x => x.OrganizationId == null);
        }

        return await query
            .OrderByDescending(x => x.OrganizationId.HasValue)
            .FirstOrDefaultAsync();
    }

    private static IReadOnlyList<string> ExpandUnitAliasesForLookup(string unit)
    {
        return unit switch
        {
            "t" => new[] { "t", "tsp" },
            "T" => new[] { "T", "tbsp" },
            "c" => new[] { "c", "C" },
            "mL" => new[] { "mL", "ml" },
            "L" => new[] { "L", "l" },
            _ => new[] { unit }
        };
    }

    private static string NormalizeUnit(string? unit)
    {
        var normalized = (unit ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return string.Empty;
        }

        // Preserve canonical dropdown symbols exactly.
        if (normalized == "t") return "t";
        if (normalized == "T") return "T";
        if (normalized == "c") return "c";
        if (normalized == "mL") return "mL";
        if (normalized == "L") return "L";

        var key = normalized.ToLowerInvariant();
        return key switch
        {
            "tsp" or "teaspoon" or "teaspoons" => "t",
            "tbsp" or "tablespoon" or "tablespoons" => "T",
            "cup" or "cups" or "c" => "c",
            "ml" => "mL",
            "l" => "L",
            _ => key
        };
    }

    private static string? NormalizeCategory(string? category)
    {
        var value = (category ?? string.Empty).Trim().ToLowerInvariant();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static bool CategoriesMatch(string? left, string? right)
    {
        var normalizedLeft = NormalizeCategory(left);
        var normalizedRight = NormalizeCategory(right);
        return normalizedLeft == normalizedRight;
    }

    private static bool FactorsMatch(decimal left, decimal right)
    {
        var difference = Math.Abs(left - right);
        return difference <= 0.00000001m;
    }

    private static string? GetCategoryForUnit(string unit)
    {
        var normalized = NormalizeUnit(unit);
        foreach (var category in UnitsByCategory)
        {
            if (category.Value.Contains(normalized))
            {
                return category.Key;
            }
        }

        return null;
    }

    private async Task<(decimal Value, bool UsedOrganizationOverride)> ConvertWithinCategoryAsync(
        long? organizationId,
        decimal value,
        string fromUnit,
        string toUnit,
        string category)
    {
        if (fromUnit == toUnit)
        {
            return (value, false);
        }

        var direct = await FindBestConversionAsync(organizationId, fromUnit, toUnit, category);
        if (direct != null)
        {
            return (value * direct.ConversionFactor, direct.OrganizationId.HasValue);
        }

        var reverse = await FindBestConversionAsync(organizationId, toUnit, fromUnit, category);
        if (reverse != null)
        {
            if (reverse.ConversionFactor == 0)
            {
                throw new InvalidOperationException("Reverse conversion factor cannot be zero.");
            }

            var factor = 1m / reverse.ConversionFactor;
            return (value * factor, reverse.OrganizationId.HasValue);
        }

        var chained = await TryConvertViaPathAsync(organizationId, fromUnit, toUnit, category);
        if (chained != null)
        {
            return (value * chained.Value.Factor, chained.Value.UsedOrganizationOverride);
        }

        throw new InvalidOperationException($"No conversion exists for '{fromUnit}' -> '{toUnit}' in category '{category}'.");
    }

    private async Task<ConvertUnitResponse?> TryConvertUsingItemDensityAsync(
        Guid organizationGuidId,
        long? organizationId,
        decimal value,
        string fromUnit,
        string toUnit,
        Guid? inventoryItemExternalId)
    {
        var fromUt = NormalizeUnit(fromUnit);
        var toUt = NormalizeUnit(toUnit);
        if (!inventoryItemExternalId.HasValue)
        {


            _logger.LogDebug(
                "Density fallback skipped for {FromUnit}->{ToUnit}: inventoryItemExternalId missing.",
                fromUt,
                toUt);
            return null;
        }
        var safeInventoryItemExternalId = inventoryItemExternalId?.ToString() ?? "NULL_GUID";


        var fromCategory = GetCategoryForUnit(fromUnit);
        var toCategory = GetCategoryForUnit(toUnit);

        var isCrossCategory = (fromCategory == "volume" && toCategory == "weight")
                           || (fromCategory == "weight" && toCategory == "volume");

        if (!isCrossCategory)
        {
            _logger.LogDebug(
                "Density fallback skipped for item {InventoryItemExternalId}: {FromUnit}->{ToUnit} is not cross-category (from={FromCategory}, to={ToCategory}).",
                safeInventoryItemExternalId,
                fromUt,
                toUt,
                fromCategory ?? "unknown",
                toCategory ?? "unknown");
            return null;
        }
        
        if (inventoryItemExternalId is null)
            return null;

        Guid externalId = inventoryItemExternalId.Value;

        var item = await _context.InventoryItems
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.ExternalId == externalId &&
                x.OrganizationId == organizationGuidId &&
                x.IsActive);
                
        if (item == null)
        {
            _logger.LogWarning(
                "Density fallback failed for item {InventoryItemExternalId}: inventory item not found for organization {OrganizationGuidId}.",
                safeInventoryItemExternalId,
                organizationGuidId);
            return null;
        }

        var purchaseUnit = NormalizeUnit(item.DefaultPurchaseUnitOfMeasure);
        var density = item.DefaultItemDensity;

        if (string.IsNullOrWhiteSpace(purchaseUnit) || !density.HasValue || density.Value <= 0)
        {

            _logger.LogWarning(
                "Density fallback failed for item {InventoryItemExternalId}: missing/invalid purchase unit or density (purchaseUnit='{PurchaseUnit}', density={Density}).",
                safeInventoryItemExternalId,
                purchaseUnit,
                density);
            return null;
        }

        var purchaseUnitCategory = GetCategoryForUnit(purchaseUnit);
        if (purchaseUnitCategory != "volume")
        {
            _logger.LogDebug(
                "Skipping density fallback for item {InventoryItemExternalId}. Purchase unit '{PurchaseUnit}' category '{PurchaseUnitCategory}' is not density-bridge compatible.",
                safeInventoryItemExternalId,
                purchaseUnit,
                purchaseUnitCategory ?? "unknown");
            return null;
        }

        try
        {
            decimal convertedValue;
            var usedOverride = false;

            if (fromCategory == "volume" && toCategory == "weight")
            {
                var toPurchase = await ConvertWithinCategoryAsync(organizationId, value, fromUnit, purchaseUnit, "volume");
                var grams = toPurchase.Value * density.Value;
                var fromGrams = await ConvertWithinCategoryAsync(organizationId, grams, "g", toUnit, "weight");

                convertedValue = fromGrams.Value;
                usedOverride = toPurchase.UsedOrganizationOverride || fromGrams.UsedOrganizationOverride;
            }
            else
            {
                var toGrams = await ConvertWithinCategoryAsync(organizationId, value, fromUnit, "g", "weight");
                var purchaseQty = toGrams.Value / density.Value;
                var toTarget = await ConvertWithinCategoryAsync(organizationId, purchaseQty, purchaseUnit, toUnit, "volume");

                convertedValue = toTarget.Value;
                usedOverride = toGrams.UsedOrganizationOverride || toTarget.UsedOrganizationOverride;
            }

            var appliedFactor = value == 0 ? 0 : convertedValue / value;

            return new ConvertUnitResponse
            {
                OriginalValue = value,
                FromUnit = fromUnit,
                ConvertedValue = convertedValue,
                ToUnit = toUnit,
                AppliedFactor = appliedFactor,
                UsedOrganizationOverride = usedOverride,
                UsedReverseConversion = false
            };
        }
        catch (InvalidOperationException)
        {
            return null;
        }
    }

    private async Task<(decimal Factor, bool UsedOrganizationOverride)?> TryConvertViaPathAsync(
        long? organizationId,
        string fromUnit,
        string toUnit,
        string? category)
    {
        var effectiveRows = await GetEffectiveConversionRowsAsync(organizationId, category);
        if (effectiveRows.Count == 0)
        {
            return null;
        }

        var edgeMap = BuildEdgeMap(effectiveRows);
        if (edgeMap.Count == 0)
        {
            return null;
        }

        var adjacency = new Dictionary<string, List<(string ToUnit, decimal Factor, bool IsOverride)>>();
        foreach (var edge in edgeMap.Values)
        {
            if (!adjacency.TryGetValue(edge.FromUnit, out var neighbors))
            {
                neighbors = new List<(string ToUnit, decimal Factor, bool IsOverride)>();
                adjacency[edge.FromUnit] = neighbors;
            }

            neighbors.Add((edge.ToUnit, edge.Factor, edge.IsOverride));
        }

        foreach (var key in adjacency.Keys.ToList())
        {
            adjacency[key] = adjacency[key]
                .OrderByDescending(x => x.IsOverride)
                .ThenBy(x => x.ToUnit)
                .ToList();
        }

        var queue = new Queue<(string Unit, decimal Factor, bool UsedOverride, int Depth)>();
        var visitedDepth = new Dictionary<string, int> { [fromUnit] = 0 };
        const int maxDepth = 6;

        queue.Enqueue((fromUnit, 1m, false, 0));

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            if (current.Unit == toUnit)
            {
                return (current.Factor, current.UsedOverride);
            }

            if (current.Depth >= maxDepth)
            {
                continue;
            }

            if (!adjacency.TryGetValue(current.Unit, out var nextEdges))
            {
                continue;
            }

            foreach (var next in nextEdges)
            {
                var nextDepth = current.Depth + 1;
                if (visitedDepth.TryGetValue(next.ToUnit, out var existingDepth) && existingDepth <= nextDepth)
                {
                    continue;
                }

                visitedDepth[next.ToUnit] = nextDepth;
                queue.Enqueue((
                    next.ToUnit,
                    current.Factor * next.Factor,
                    current.UsedOverride || next.IsOverride,
                    nextDepth));
            }
        }

        return null;
    }

    private static Dictionary<(string FromUnit, string ToUnit), (string FromUnit, string ToUnit, decimal Factor, bool IsOverride, int Score)> BuildEdgeMap(
        List<UnitConversion> rows)
    {
        var edgeMap = new Dictionary<(string FromUnit, string ToUnit), (string FromUnit, string ToUnit, decimal Factor, bool IsOverride, int Score)>();

        foreach (var row in rows)
        {
            var from = NormalizeUnit(row.FromUnit);
            var to = NormalizeUnit(row.ToUnit);
            var isOverride = row.OrganizationId.HasValue;

            if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            {
                continue;
            }

            AddOrReplaceEdge(edgeMap, from, to, row.ConversionFactor, isOverride, explicitDirection: true);

            if (row.ConversionFactor != 0)
            {
                AddOrReplaceEdge(edgeMap, to, from, 1m / row.ConversionFactor, isOverride, explicitDirection: false);
            }
        }

        return edgeMap;
    }

    private static void AddOrReplaceEdge(
        Dictionary<(string FromUnit, string ToUnit), (string FromUnit, string ToUnit, decimal Factor, bool IsOverride, int Score)> edgeMap,
        string from,
        string to,
        decimal factor,
        bool isOverride,
        bool explicitDirection)
    {
        var key = (from, to);
        var score = (explicitDirection ? 2 : 1) + (isOverride ? 2 : 0);

        if (!edgeMap.TryGetValue(key, out var existing) || score > existing.Score)
        {
            edgeMap[key] = (from, to, factor, isOverride, score);
        }
    }

    private async Task<List<UnitConversion>> GetEffectiveConversionRowsAsync(long? organizationId, string? category)
    {
        var query = _context.UnitConversions
            .AsNoTracking()
            .Where(x => x.IsActive);

        if (organizationId.HasValue)
        {
            query = query.Where(x => x.OrganizationId == organizationId || x.OrganizationId == null);
        }
        else
        {
            query = query.Where(x => x.OrganizationId == null);
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(x => x.Category == category);
        }

        return await query
            .OrderByDescending(x => x.OrganizationId.HasValue)
            .ThenBy(x => x.FromUnit)
            .ThenBy(x => x.ToUnit)
            .ToListAsync();
    }

    private async Task<long?> ResolveOrganizationNumericIdAsync(Guid organizationGuidId)
    {
        var connection = _context.Database.GetDbConnection();
        var closeAfter = connection.State != ConnectionState.Open;

        if (closeAfter)
        {
            await connection.OpenAsync();
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT id FROM organization WHERE organization_id = @organizationId LIMIT 1";

            var parameter = command.CreateParameter();
            parameter.ParameterName = "@organizationId";
            parameter.Value = organizationGuidId;
            command.Parameters.Add(parameter);

            var scalar = await command.ExecuteScalarAsync();
            if (scalar == null || scalar == DBNull.Value)
            {
                return null;
            }

            return Convert.ToInt64(scalar);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Unable to resolve organization ID for org {OrganizationGuidId}.", organizationGuidId);
            return null;
        }
        finally
        {
            if (closeAfter)
            {
                await connection.CloseAsync();
            }
        }
    }
}
