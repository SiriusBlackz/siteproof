import { NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { projects, stripeEvents } from "@/server/db/schema";
import { getStripe } from "@/server/services/stripe";
import { writeAuditLog } from "@/server/services/audit";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

class DuplicateEventError extends Error {
  constructor(public eventId: string) {
    super(`Stripe event ${eventId} already processed`);
    this.name = "DuplicateEventError";
  }
}

async function processEvent(tx: Tx, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const projectId = session.metadata?.projectId;
      if (!projectId) break;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      await tx
        .update(projects)
        .set({
          status: "active",
          stripeSubscriptionId: subscriptionId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      await writeAuditLog(tx, {
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

      const project = await tx.query.projects.findFirst({
        where: eq(projects.stripeSubscriptionId, subscriptionId),
      });
      if (!project) break;

      await tx
        .update(projects)
        .set({ status: "payment_failed", updatedAt: new Date() })
        .where(eq(projects.id, project.id));

      await writeAuditLog(tx, {
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
      if (!projectId) break;

      await tx
        .update(projects)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      await writeAuditLog(tx, {
        projectId,
        userId: null,
        action: "cancel_subscription",
        entityType: "subscription",
        entityId: projectId,
        metadata: { subscriptionId: subscription.id },
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const projectId = subscription.metadata?.projectId;
      if (!projectId) break;

      if (subscription.status === "active") {
        const project = await tx.query.projects.findFirst({
          where: eq(projects.id, projectId),
        });
        if (project && project.status === "payment_failed") {
          await tx
            .update(projects)
            .set({ status: "active", updatedAt: new Date() })
            .where(eq(projects.id, projectId));
        }
      }
      break;
    }
  }
}

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

  // Idempotency: record the event id and process it in one transaction.
  // If the id already exists, we've seen this delivery before — ack with 200
  // without running the handler again.
  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(stripeEvents)
        .values({ id: event.id, type: event.type })
        .onConflictDoNothing()
        .returning({ id: stripeEvents.id });

      if (inserted.length === 0) {
        throw new DuplicateEventError(event.id);
      }

      await processEvent(tx, event);
    });
  } catch (err) {
    if (err instanceof DuplicateEventError) {
      console.log(`[stripe webhook] Duplicate event ${event.id} ignored`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Real failure — return 500 so Stripe retries. The transaction rolled
    // back the stripe_events insert, so the next delivery will re-process.
    console.error(`[stripe webhook] Error handling ${event.type}:`, err);
    return NextResponse.json(
      { error: "Handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
