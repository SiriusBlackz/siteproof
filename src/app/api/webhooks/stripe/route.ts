import { NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { getStripe } from "@/server/services/stripe";
import { writeAuditLog } from "@/server/services/audit";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const projectId = session.metadata?.projectId;
        if (!projectId) break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        await db
          .update(projects)
          .set({
            status: "active",
            stripeSubscriptionId: subscriptionId ?? null,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId));

        writeAuditLog(db, {
          projectId,
          userId: null,
          action: "subscribe",
          entityType: "subscription",
          entityId: projectId,
          metadata: { subscriptionId, checkoutSessionId: session.id },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.subscription_details;
        const subscriptionId =
          subDetails
            ? typeof subDetails.subscription === "string"
              ? subDetails.subscription
              : subDetails.subscription?.id
            : null;

        if (!subscriptionId) break;

        const project = await db.query.projects.findFirst({
          where: eq(projects.stripeSubscriptionId, subscriptionId),
        });
        if (!project) break;

        await db
          .update(projects)
          .set({ status: "payment_failed", updatedAt: new Date() })
          .where(eq(projects.id, project.id));

        writeAuditLog(db, {
          projectId: project.id,
          userId: null,
          action: "payment_failed",
          entityType: "subscription",
          entityId: project.id,
          metadata: { subscriptionId, invoiceId: invoice.id },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const projectId = subscription.metadata?.projectId;

        if (projectId) {
          await db
            .update(projects)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(projects.id, projectId));

          writeAuditLog(db, {
            projectId,
            userId: null,
            action: "cancel_subscription",
            entityType: "subscription",
            entityId: projectId,
            metadata: { subscriptionId: subscription.id },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const projectId = subscription.metadata?.projectId;
        if (!projectId) break;

        // Sync status if subscription becomes active again (e.g. payment retry succeeded)
        if (subscription.status === "active") {
          const project = await db.query.projects.findFirst({
            where: eq(projects.id, projectId),
          });
          if (project && project.status === "payment_failed") {
            await db
              .update(projects)
              .set({ status: "active", updatedAt: new Date() })
              .where(eq(projects.id, projectId));
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[stripe webhook] Error handling ${event.type}:`, err);
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true });
}
