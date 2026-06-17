namespace PreOrderApp.Models;

public class OrderItem
{
    public long Id { get; set; }  // BIGINT primary key (for joins)
    public Guid ExternalId { get; set; }  // UUID external ID (for APIs)
    
    // Foreign Key Naming Convention: <<parent_table>>__<<child_table>>__<<column>>__FK
    [System.ComponentModel.DataAnnotations.Schema.Column("customer_order_id")]
    public long OrderId { get; set; }  // BIGINT FK to customer_order (column: customer_order_id)
    
    [System.ComponentModel.DataAnnotations.Schema.Column("product_id")] // product id for orders or menu item id for preorder
    public long ProductId { get; set; }

    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    // NOTE: LineTotal removed - this is a calculated value (UnitPrice × Quantity) and not persisted in database
    public string? Customizations { get; set; }
    public decimal FulfilledQty { get; set; } = 0;      // Phase 2: How much has been fulfilled
    public string OrderItemStatus { get; set; } = "PENDING";  // Phase 2: PENDING, PARTIAL, FULFILLED, CANCELLED
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedBy { get; set; }
    public int VersionNbr { get; set; } = 1;

    public virtual Order? Order { get; set; }

    public virtual MenuItem? MenuItem { get; set; }
    public virtual SellableProduct? SellableProduct { get; set; }
}