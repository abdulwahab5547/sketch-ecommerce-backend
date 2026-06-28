// Email transport (Gmail SMTP via nodemailer) + order-notification helpers.
//
// Design notes:
//  - Lazy-configured, mirroring lib/cloudinary.js.
//  - Sending NEVER throws into the request path. If mail is misconfigured or
//    Gmail is down, the order still succeeds — we just log a warning. Email is
//    a side effect, not a prerequisite.
//  - We `await` sends (rather than fire-and-forget) because on serverless
//    (Vercel) the function may freeze right after the HTTP response, killing
//    any unawaited background work.
import nodemailer from "nodemailer";
import { getSettings } from "../models/Settings.js";
import {
  orderConfirmationEmail,
  orderStatusEmail,
  ownerNewOrderEmail,
  ownerCommissionEmail,
  commissionConfirmationEmail,
} from "./emails.js";

let transport = null;
let warnedMissing = false;

function mailUser() {
  return process.env.MAIL_USER || "";
}

// Gmail app passwords are displayed in 4-char groups ("vxey grlx ...") for
// readability; the spaces aren't part of the secret.
function mailPass() {
  return (process.env.MAIL_PASS || "").replace(/\s+/g, "");
}

export function mailConfigured() {
  return Boolean(mailUser() && mailPass());
}

function fromHeader() {
  return process.env.MAIL_FROM || mailUser();
}

function ownerAddress() {
  return process.env.OWNER_EMAIL || mailUser();
}

function storeUrl() {
  if (process.env.STORE_URL) return process.env.STORE_URL.replace(/\/+$/, "");
  const cors = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",")[0].trim();
  return cors.replace(/\/+$/, "");
}

function getTransport() {
  if (transport) return transport;
  if (!mailConfigured()) {
    if (!warnedMissing) {
      console.warn(
        "[mailer] MAIL_USER / MAIL_PASS not set — order emails are disabled. " +
          "Set them in backend/.env to enable notifications."
      );
      warnedMissing = true;
    }
    return null;
  }
  transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: mailUser(), pass: mailPass() },
  });
  return transport;
}

// Low-level send. Returns true on success, false otherwise — never throws.
export async function sendMail({ to, subject, html, text }) {
  const t = getTransport();
  if (!t) return false;
  if (!to) return false;
  try {
    const info = await t.sendMail({ from: fromHeader(), to, subject, html, text });
    console.log(`[mailer] sent "${subject}" to ${to} (${info.messageId})`);
    return true;
  } catch (err) {
    console.error(`[mailer] failed to send "${subject}" to ${to}:`, err.message);
    return false;
  }
}

// ---------- Order notifications ----------

// Fired right after an order is placed: confirmation to the customer +
// new-order alert to the owner. Safe to await; failures are swallowed.
export async function notifyOrderPlaced(orderDoc) {
  if (!mailConfigured()) {
    getTransport(); // emit the one-time warning
    return;
  }
  const order = typeof orderDoc.toJSON === "function" ? orderDoc.toJSON() : orderDoc;
  const url = storeUrl();

  let settings = null;
  try {
    settings = await getSettings();
    settings = typeof settings.toJSON === "function" ? settings.toJSON() : settings;
  } catch (err) {
    console.error("[mailer] couldn't load settings for payment block:", err.message);
  }

  const tasks = [];

  if (order.customer?.email) {
    const msg = orderConfirmationEmail(order, settings, url);
    tasks.push(sendMail({ to: order.customer.email, ...msg }));
  }

  const owner = ownerAddress();
  if (owner) {
    const msg = ownerNewOrderEmail(order, url);
    tasks.push(sendMail({ to: owner, ...msg }));
  }

  await Promise.allSettled(tasks);
}

// Fired when an order's status changes to confirmed or cancelled. Sends a
// status update to the customer. Other transitions send nothing.
export async function notifyOrderStatusChanged(orderDoc) {
  if (!mailConfigured()) {
    getTransport();
    return;
  }
  const order = typeof orderDoc.toJSON === "function" ? orderDoc.toJSON() : orderDoc;
  if (order.status !== "confirmed" && order.status !== "cancelled") return;
  if (!order.customer?.email) return;

  let settings = null;
  try {
    settings = await getSettings();
    settings = typeof settings.toJSON === "function" ? settings.toJSON() : settings;
  } catch {
    /* non-fatal */
  }

  const msg = orderStatusEmail(order, settings, storeUrl());
  await sendMail({ to: order.customer.email, ...msg });
}

// Fired when a commission request is submitted: alert the owner + confirm to
// the requester. Never throws.
export async function notifyCommission(commissionDoc) {
  if (!mailConfigured()) {
    getTransport();
    return;
  }
  const c = typeof commissionDoc.toJSON === "function" ? commissionDoc.toJSON() : commissionDoc;
  const url = storeUrl();
  const tasks = [];

  const owner = ownerAddress();
  if (owner) {
    const msg = ownerCommissionEmail(c, url);
    tasks.push(sendMail({ to: owner, ...msg }));
  }
  if (c.email) {
    const msg = commissionConfirmationEmail(c);
    tasks.push(sendMail({ to: c.email, ...msg }));
  }

  await Promise.allSettled(tasks);
}
