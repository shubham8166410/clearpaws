import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

/** One-time PDF document pack */
export const PRICE_ID = process.env.STRIPE_PRICE_ID!;
export const AMOUNT_CENTS = 1500; // $15 AUD

/** Monthly subscription — $9.90 AUD/mo */
export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_SUBSCRIPTION_PRICE_ID!;

/** B2B agency white-label portal — $299 AUD/mo */
export const B2B_PRICE_ID = process.env.B2B_STRIPE_PRICE_ID!;
