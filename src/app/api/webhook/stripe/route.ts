import { NextRequest, NextResponse } from "next/server";
import { stripe, AMOUNT_CENTS } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import type Stripe from "stripe";
import type { SubscriptionStatus, UserRole } from "@/types/subscription";

/** POST /api/webhook/stripe — handle Stripe events server-side */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("[stripe/webhook] Signature error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    // ── One-time PDF purchase ────────────────────────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // B2B agency subscription activation
      if (
        session.metadata?.type === "b2b" &&
        session.metadata?.agencyId &&
        session.subscription
      ) {
        const { error: agencyErr } = await supabase
          .from("agencies")
          .update({ stripe_subscription_id: session.subscription as string })
          .eq("id", session.metadata.agencyId);
        if (agencyErr) {
          console.error("[stripe/webhook] Failed to activate agency subscription:", agencyErr.message);
          return NextResponse.json({ error: "DB error" }, { status: 500 });
        }
        break;
      }

      // Only handle one-time payments here — subscriptions handled separately
      if (session.mode !== "payment") break;

      const { userId, timelineId } = session.metadata ?? {};
      if (!userId || !timelineId) {
        console.error("[stripe/webhook] Missing metadata on payment session:", session.id);
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
      }

      const { error } = await supabase.from("purchases").insert({
        user_id: userId,
        timeline_id: timelineId,
        stripe_session_id: session.id,
        amount_cents: AMOUNT_CENTS,
      });

      if (error) {
        if (error.code === "23505") break; // Already processed — idempotent
        console.error("[stripe/webhook] Purchase insert failed:", error.message);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }

      // Mark user as paid_once (preserves PDF purchase role even if they cancel subscription later)
      const { error: roleErr } = await supabase
        .from("profiles")
        .update({ role: "paid_once" as UserRole })
        .eq("id", userId);
      if (roleErr) {
        console.error("[stripe/webhook] Failed to set paid_once role:", roleErr.message);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      break;
    }

    // ── Subscription created / updated ───────────────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;

      // B2B agency subscription — keep stripe_subscription_id current
      const b2bAgencyId = sub.metadata?.agencyId;
      if (b2bAgencyId) {
        const { error: agencySubErr } = await supabase
          .from("agencies")
          .update({ stripe_subscription_id: sub.id })
          .eq("id", b2bAgencyId);
        if (agencySubErr) {
          console.error("[stripe/webhook] B2B subscription update failed:", agencySubErr.message);
          return NextResponse.json({ error: "DB error" }, { status: 500 });
        }
        break;
      }

      const userId = sub.metadata?.userId;
      if (!userId) {
        console.error("[stripe/webhook] Missing userId in subscription metadata:", sub.id);
        break;
      }

      const stripeStatus = sub.status;
      const dbStatus: SubscriptionStatus =
        stripeStatus === "active" ? "active"
        : stripeStatus === "past_due" ? "past_due"
        : "cancelled";

      // current_period_end is a Unix timestamp on the Stripe Subscription object
      const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end;
      if (typeof periodEnd !== "number" || periodEnd <= 0) {
        console.error("[stripe/webhook] Invalid current_period_end on subscription:", sub.id);
        return NextResponse.json({ error: "Invalid subscription data" }, { status: 500 });
      }

      const { error: upsertErr } = await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_subscription_id: sub.id,
        stripe_customer_id: sub.customer as string,
        status: dbStatus,
        current_period_end: new Date(periodEnd * 1000).toISOString(),
      }, { onConflict: "user_id" });

      if (upsertErr) {
        console.error("[stripe/webhook] Subscription upsert failed:", upsertErr.message);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }

      // Keep profiles.role in sync.
      // On non-active status, check purchases table before reverting role
      // (mirrors subscription.deleted logic to avoid incorrectly granting paid_once).
      let role: UserRole;
      if (dbStatus === "active") {
        role = "subscriber";
      } else {
        const { data: purchase } = await supabase
          .from("purchases")
          .select("id")
          .eq("user_id", userId)
          .single();
        role = purchase ? "paid_once" : "free";
      }

      const { error: roleErr } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);
      if (roleErr) {
        console.error("[stripe/webhook] Failed to update role:", roleErr.message);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      break;
    }

    // ── Subscription cancelled ───────────────────────────────────────────────
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;

      // B2B agency subscription cancelled — clear stripe_subscription_id
      const b2bAgencyId = sub.metadata?.agencyId;
      if (b2bAgencyId) {
        const { error: agencyDelErr } = await supabase
          .from("agencies")
          .update({ stripe_subscription_id: null })
          .eq("stripe_subscription_id", sub.id);
        if (agencyDelErr) {
          console.error("[stripe/webhook] B2B subscription delete failed:", agencyDelErr.message);
          return NextResponse.json({ error: "DB error" }, { status: 500 });
        }
        break;
      }

      const userId = sub.metadata?.userId;
      if (!userId) {
        console.error("[stripe/webhook] Missing userId in deleted subscription metadata:", sub.id);
        break;
      }

      const { error: updateErr, count } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" as SubscriptionStatus })
        .eq("stripe_subscription_id", sub.id);

      if (updateErr) {
        console.error("[stripe/webhook] Subscription cancel update failed:", updateErr.message);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      if (count === 0) {
        console.error("[stripe/webhook] No subscription row found for:", sub.id, "userId:", userId);
      }

      // Check if user has a past PDF purchase before reverting their role
      const { data: purchase } = await supabase
        .from("purchases")
        .select("id")
        .eq("user_id", userId)
        .single();

      const role: UserRole = purchase ? "paid_once" : "free";
      const { error: roleErr } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);
      if (roleErr) {
        console.error("[stripe/webhook] Failed to revert role on cancel:", roleErr.message);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      break;
    }

    // ── Payment failed ───────────────────────────────────────────────────────
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      // subscription field exists on Invoice at runtime but type varies by Stripe API version
      const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
      if (!subscriptionId) break;

      const { error: updateErr } = await supabase
        .from("subscriptions")
        .update({ status: "past_due" as SubscriptionStatus })
        .eq("stripe_subscription_id", subscriptionId);
      if (updateErr) {
        console.error("[stripe/webhook] past_due update failed:", updateErr.message);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      break;
    }

    default:
      // Gracefully ignore all other event types
      break;
  }

  return NextResponse.json({ received: true });
}
