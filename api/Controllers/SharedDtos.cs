using System;

namespace PreOrderApp.Controllers
{
    /// <summary>
    /// Shared request DTOs used across multiple controllers
    /// </summary>

    /// <summary>
    /// Request DTO for checking inventory availability
    /// Used by: OrdersController, InventoryCheckAvailabilityController
    /// </summary>
    public class InventoryCheckAvailabilityRequest
    {
        /// <summary>
        /// External ID of the inventory item to check
        /// </summary>
        public Guid InventoryItemExternalId { get; set; }

        /// <summary>
        /// Quantity to check availability for
        /// </summary>
        public decimal Quantity { get; set; }
    }
}
