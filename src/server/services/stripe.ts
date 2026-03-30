import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { organisations } from "@/server/db/schema";
import type { db as dbType } from "@/server/db";

type DB = typeof dbType;

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return stripeInstance;
}

export { getStripe };

/**
 * Find or create a Stripe Customer for an organisation.
 * Stores the customer ID on the organisations table.
 */
export async function getOrCreateCustomer(
  db: DB,
  orgId: string,
  orgName: string,
  email: string
): Promise<string> {
  const org = await db.query.organisations.findFirst({
    where: eq(organisations.id, orgId),
  });

  if (org?.stripeCustomerId) {
    return org.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    name: orgName,
    email,
    metadata: { orgId },
  });

  await db
    .update(organisations)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(organisations.id, orgId));

  return customer.id;
}

/**
 * Create a Stripe Checkout Session for a new project subscription.
 */
export async function createCheckoutSession(opts: {
  customerId: string;
  projectId: string;
  projectName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    customer: opts.customerId,
    mode: "subscription",
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: { projectId: opts.projectId },
    },
    metadata: { projectId: opts.projectId },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });

  return session.url!;
}

/**
 * Create a Stripe Customer Portal session for billing management.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Cancel a Stripe subscription (at period end by default).
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  const stripe = getStripe();
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
