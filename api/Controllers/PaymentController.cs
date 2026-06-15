using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;

namespace PreOrderApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly PaymentService _paymentService;
        private readonly IOrderService _orderService;
        private readonly ILogger<PaymentController> _logger;

        public PaymentController(PaymentService paymentService, IOrderService orderService, ILogger<PaymentController> logger)
        {
            _paymentService = paymentService;
            _orderService = orderService;
            _logger = logger;
        }


    [HttpPost("create-intent/{orderType}")]
    [AllowAnonymous]
    public async Task<IActionResult> CreateIntent([FromRoute] string orderType, [FromBody] CreatePaymentRequest request)
        {
            string lclOrderType = orderType?.ToUpper() ?? string.Empty;
            if (lclOrderType != "PREORDER" && lclOrderType != "SUBSCRIPTION" && lclOrderType != "ORDER")
            {
                return BadRequest(new { message = "A problem has occurred.  Invalid Order type." });
            }
            string returnUrl;
            switch (lclOrderType)
            {
                case "PREORDER":
                    returnUrl =  "";
                    break;
                case "SUBSCRIPTION":
                    returnUrl =  "";
                    break;
                case "ORDER":
                    returnUrl =  "";
                    break;
                default:
                    return BadRequest(new { message = "A problem has occurred.  Invalid Order type." });
            }
//Try catch to convert the untrustedAmount to a dollar so it can be passed to the payment service.  If it fails, log the error and return a bad request.

            try
            {
                decimal lclUntrustedOrderAmount = decimal.Parse(request.untrustedOrderAmt);
                var result = await _paymentService.CreatePaymentIntentAsync(
                    request.OrderId,
                    lclOrderType,
                    returnUrl,
                    lclUntrustedOrderAmount);

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (NotSupportedException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating payment intent for {OrderType} {OrderId}", lclOrderType, request.OrderId);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred while creating the payment intent." });
            }
        }

    }

    public class CreatePaymentRequest
    {
        public Guid OrderId { get; set; }
        public string? OrderType { get; set; }
        public string? ReturnUrl { get; set; }
        public string? untrustedOrderAmt { get; set; }
    }
}
