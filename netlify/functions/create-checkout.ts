import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { getStripeSecretKey, hasStripeSecretKey } from "../../shared/config.js";
import { isDonationPresetAmount } from "../../shared/donate.js";

function getOrigin(event: Parameters<Handler>[0]): string {
  const headers = event.headers;
  const host = headers.host || headers["x-forwarded-host"];
  if (!host) return "http://localhost:8888";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = isLocalhost ? "http" : headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

export const handler: Handler = async (event) => {
  const origin = getOrigin(event);
  const jsonHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        ...jsonHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!hasStripeSecretKey()) {
    return {
      statusCode: 503,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Donations are not configured" }),
    };
  }

  let body: { amount?: number };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { amount } = body;
  if (typeof amount !== "number" || !isDonationPresetAmount(amount)) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Invalid donation amount" }),
    };
  }

  const stripe = new Stripe(getStripeSecretKey());

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: amount,
            product_data: {
              name: "Support Mattison World Cup Predictor",
            },
          },
        },
      ],
      success_url: `${origin}/?donated=1`,
      cancel_url: `${origin}/?donated=cancelled`,
    });

    if (!session.url) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Failed to create checkout session" }),
      };
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("create-checkout error:", err);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Failed to create checkout session" }),
    };
  }
};
