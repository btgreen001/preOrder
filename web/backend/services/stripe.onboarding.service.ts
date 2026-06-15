import Stripe from 'stripe';
import express from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const app = express();
app.post('/api/stripe/create-onboarding-link', async (req, res) => {
  try {
    const accountId = req.user?.stripeAccountId;

    if (!accountId) {
      return res.status(400).json({ error: "Missing Stripe account ID" });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://yourapp.com/registration/step2',
      return_url: 'https://yourapp.com/registration/complete',
      type: 'account_onboarding'
    });

    res.json({ url: link.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stripe onboarding failed' });
  }
});

