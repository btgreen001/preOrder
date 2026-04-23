namespace PreOrderApp.Models;

public class PreOrderLine
{
    public long Id { get; set; }
    public Guid ExternalId { get; set; }
    public long PreOrderId { get; set; }
    public long MenuItemId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }

    public virtual PreOrder? PreOrder { get; set; }
    public virtual MenuItem? MenuItem { get; set; }
}
