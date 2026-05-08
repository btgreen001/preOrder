namespace PreOrderApp.Models;

public class Organization
{
    public Guid OrganizationId { get; set; }
    public Guid? ParentOrganizationId { get; set; }  // NEW: For multi-tenant hierarchies
    public string OrganizationName { get; set; } = string.Empty;
    public string PrimaryEmail { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? AddressLine3 { get; set; }
    public string? Locality { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? CountryCode { get; set; }
    public string RegistrationToken { get; set; } = string.Empty;
    public string? HashSalt { get; set; }
    public bool IsEnabled { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime ModifiedOn { get; set; }

    public virtual Organization? ParentOrganization { get; set; }
    public virtual ICollection<Organization> ChildOrganizations { get; set; } = new List<Organization>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    public virtual ICollection<Customer> Customers { get; set; } = new List<Customer>();
    public virtual ICollection<Supplier> Suppliers { get; set; } = new List<Supplier>();
    public virtual ICollection<ItemCategory> ItemCategories { get; set; } = new List<ItemCategory>();
    public virtual ICollection<ProductCategory> ProductCategories { get; set; } = new List<ProductCategory>();
    public virtual ICollection<SellableProduct> SellableProducts { get; set; } = new List<SellableProduct>();
    public virtual ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
    public virtual ICollection<InventoryMovement> InventoryMovements { get; set; } = new List<InventoryMovement>();
}