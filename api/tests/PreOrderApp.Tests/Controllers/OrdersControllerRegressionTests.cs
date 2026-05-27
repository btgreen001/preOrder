using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using PreOrderApp.Controllers;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;
using Xunit;

namespace PreOrderApp.Tests.Controllers;

public class OrdersControllerRegressionTests
{
    [Fact]
    public async Task UpdateOrderStatus_EmptyStatus_ReturnsBadRequest_AndSkipsServiceCall()
    {
        var orderService = new Mock<IOrderService>();
        var orgContext = new Mock<IOrganizationContextService>();
        var logger = Mock.Of<ILogger<OrdersController>>();
        var sut = new OrdersController(orderService.Object, logger, orgContext.Object);

        var result = await sut.UpdateOrderStatus(Guid.NewGuid(), new UpdateOrderStatusRequest { NewStatus = "   " });

        Assert.IsType<BadRequestObjectResult>(result);
        orderService.Verify(s => s.UpdateOrderStatusAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetOrderById_ServiceReturnsNull_ReturnsNotFound()
    {
        var organizationId = Guid.NewGuid();
        var externalId = Guid.NewGuid();

        var orderService = new Mock<IOrderService>();
        orderService
            .Setup(s => s.GetOrderByIdAsync(externalId, organizationId))
            .ReturnsAsync((OrderDetailDto?)null);

        var orgContext = new Mock<IOrganizationContextService>();
        orgContext.Setup(c => c.GetCurrentOrganizationId()).Returns(organizationId);

        var sut = new OrdersController(orderService.Object, Mock.Of<ILogger<OrdersController>>(), orgContext.Object);

        var result = await sut.GetOrderById(externalId);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task DeleteOrder_ServiceDeletesOrder_ReturnsNoContent()
    {
        var externalId = Guid.NewGuid();

        var orderService = new Mock<IOrderService>();
        orderService
            .Setup(s => s.DeleteOrderAsync(externalId))
            .ReturnsAsync(true);

        var sut = new OrdersController(
            orderService.Object,
            Mock.Of<ILogger<OrdersController>>(),
            Mock.Of<IOrganizationContextService>());

        var result = await sut.DeleteOrder(externalId);

        Assert.IsType<NoContentResult>(result);
    }
}
