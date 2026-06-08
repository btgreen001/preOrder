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

        [HttpPost("create-intent")]
        [Authorize]
        public async Task<IActionResult> CreateIntent([FromBody] CreatePaymentRequest request)
        {
            try
            {
                var result = await _paymentService.CreatePaymentIntentAsync(
                    request.OrderId,
                    request.OrderType ?? string.Empty,
                    request.ReturnUrl);

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
                _logger.LogError(ex, "Unexpected error creating payment intent for {OrderType} {OrderId}", request.OrderType, request.OrderId);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred while creating the payment intent." });
            }
        }
    }

    public class CreatePaymentRequest
    {
        public Guid OrderId { get; set; }
        public string? OrderType { get; set; }
        public string? ReturnUrl { get; set; }
    }
}
