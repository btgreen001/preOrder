export interface User {
  id: string;
  email: string;
  name?: string;

  // Stripe Connect fields
  stripeCustomerId?: string;       // For charging the user
  stripeAccountId?: string;        // For Connect (payouts)
  stripeAccountStatus?: "pending" | "verified" | "restricted";

  // Optional metadata
  createdAt?: Date;
  updatedAt?: Date;
}
