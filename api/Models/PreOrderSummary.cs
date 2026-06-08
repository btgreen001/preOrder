namespace PreOrderApp.Models
{
    public class PreOrderSummary
    {
        public Guid OrderId { get; set; }
        public string OrderType { get; set; } = string.Empty;
        public decimal OrderTotalAmt { get; set; }
        public string ReturnUrl { get; set; } = string.Empty;
    }
}
