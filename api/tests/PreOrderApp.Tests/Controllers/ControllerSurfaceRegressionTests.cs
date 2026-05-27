using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using PreOrderApp.Controllers;
using Xunit;

namespace PreOrderApp.Tests.Controllers;

public class ControllerSurfaceRegressionTests
{
    [Fact]
    public void AllControllers_HaveApiControllerAndRouteAttributes()
    {
        var controllerTypes = typeof(AuthController).Assembly
            .GetTypes()
            .Where(t =>
                t.IsClass &&
                !t.IsAbstract &&
                typeof(ControllerBase).IsAssignableFrom(t) &&
                t.Name.EndsWith("Controller", StringComparison.Ordinal))
            .ToList();

        Assert.NotEmpty(controllerTypes);

        foreach (var controllerType in controllerTypes)
        {
            Assert.NotNull(Attribute.GetCustomAttribute(controllerType, typeof(ApiControllerAttribute)));
            Assert.NotNull(Attribute.GetCustomAttribute(controllerType, typeof(RouteAttribute)));
        }
    }

    [Fact]
    public void AllControllers_ExposeAtLeastOneHttpEndpoint()
    {
        var controllerTypes = typeof(AuthController).Assembly
            .GetTypes()
            .Where(t =>
                t.IsClass &&
                !t.IsAbstract &&
                typeof(ControllerBase).IsAssignableFrom(t) &&
                t.Name.EndsWith("Controller", StringComparison.Ordinal));

        foreach (var controllerType in controllerTypes)
        {
            var hasHttpEndpoint = controllerType
                .GetMethods(System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public)
                .Any(m => m.GetCustomAttributes(inherit: true).OfType<HttpMethodAttribute>().Any());

            Assert.True(hasHttpEndpoint, $"{controllerType.Name} does not expose any [Http*] endpoint methods.");
        }
    }
}
