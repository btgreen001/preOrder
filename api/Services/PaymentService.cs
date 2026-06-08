using PreOrderApp.Services.Interfaces;
using Stripe;

namespace PreOrderApp.Services
{
    public class PaymentService
    {
        private readonly IConfiguration _config;
        private readonly IOrderService _orderService;
        private readonly ILogger<PaymentService> _logger;

        public PaymentService(
            IConfiguration config,
            IOrderService orderService,
            ILogger<PaymentService> logger)
        {
            _config = config;
            _orderService = orderService;
            _logger = logger;

            StripeConfiguration.ApiKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY")
                ?? _config["Stripe:SecretKey"];
        }

        public async Task<PaymentOrderSummary> GetPaymentSummaryAsync(
            Guid orderId,
            string orderType,
            string? requestedReturnUrl = null)
        {
            var summary = await _orderService.ResolveOrderSummaryAsync(orderId, orderType, requestedReturnUrl);

            return new PaymentOrderSummary
            {
                OrderId = summary.OrderId,
                OrderType = summary.OrderType,
                DisplayName = summary.DisplayName,
                TotalAmount = summary.TotalAmount,
                AmountInCents = summary.AmountInCents,
                Currency = summary.Currency,
                ReturnUrl = summary.ReturnUrl
            };
        }


        public async Task<CreatePaymentIntentResult> CreatePaymentIntentAsync(
            Guid orderId,
            string orderType,
            string? requestedReturnUrl = null)
        {
            var paymentOrder = await _orderService.ResolveOrderSummaryAsync(orderId, orderType, requestedReturnUrl);

            try
            {
                var options = new PaymentIntentCreateOptions
                {
                    Amount = paymentOrder.AmountInCents,
                    Currency = "usd",
                    AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
                    {
                        Enabled = true
                    },
                    Metadata = new Dictionary<string, string>
                    {
                        ["orderId"] = paymentOrder.OrderId.ToString(),
                        ["orderType"] = paymentOrder.OrderType
                    }
                };

                var service = new PaymentIntentService();
                var intent = await service.CreateAsync(options);

                return new CreatePaymentIntentResult
                {
                    OrderId = paymentOrder.OrderId,
                    OrderType = paymentOrder.OrderType,
                    DisplayName = paymentOrder.DisplayName,
                    TotalAmount = paymentOrder.TotalAmount,
                    AmountInCents = paymentOrder.AmountInCents,
                    Currency = paymentOrder.Currency,
                    ReturnUrl = paymentOrder.ReturnUrl,
                    PaymentIntentId = intent.Id,
                    ClientSecret = intent.ClientSecret ?? string.Empty
                };
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Stripe error creating payment intent for {OrderType} {OrderId}", paymentOrder.OrderType, paymentOrder.OrderId);
                throw new InvalidOperationException(ex.StripeError?.Message ?? ex.Message, ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating payment intent for {OrderType} {OrderId}", paymentOrder.OrderType, paymentOrder.OrderId);
                throw new InvalidOperationException("An unexpected error occurred while creating the payment intent.", ex);
            }
        }

    }
    public class PaymentOrderSummary
    {
        public Guid OrderId { get; set; }
        public string OrderType { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public long AmountInCents { get; set; }
        public string Currency { get; set; } = "usd";
        public string ReturnUrl { get; set; } = string.Empty;
    }

    public class CreatePaymentIntentResult : PaymentOrderSummary
    {
        public string PaymentIntentId { get; set; } = string.Empty;
        public string ClientSecret { get; set; } = string.Empty;
    }
}