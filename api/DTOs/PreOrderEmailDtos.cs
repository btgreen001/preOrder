namespace PreOrderApp.DTOs;

public class SendOrderEmailDto
{
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string OrderId { get; set; } = string.Empty;
    public string OrderExternalId { get; set; } = string.Empty;
    public DateTime SlotStartAt { get; set; }
    public DateTime SlotEndAt { get; set; }
    public List<SendOrderEmailLineDto> Lines { get; set; } = new();
}

public class SendOrderEmailLineDto
{
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
