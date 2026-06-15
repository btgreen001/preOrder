"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stripe_1 = __importDefault(require("stripe"));
const express_1 = __importDefault(require("express"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
const app = (0, express_1.default)();
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Stripe onboarding failed' });
    }
});
