// Pure email-template builders. Each returns { subject, html, text }.
// No side effects — the mailer (lib/mailer.js) decides how/whether to send.
//
// HTML is intentionally inline-styled and table-free-ish for broad email-client
// support, using an art-studio palette (cream paper, charcoal ink).

const INK = "#1a1612";
const MUTE = "#6b6258";
const PAPER = "#f4efe7";
const CARD = "#ffffff";
const LINE = "#e4dccf";
const ACCENT = "#9a8568";

const money = (n) => `$${Number(n || 0).toLocaleString("en-US")}`;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Outer shell shared by every email.
function layout({ preheader = "", heading, eyebrow, bodyHtml }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
</head>
<body style="margin:0;padding:0;background:${PAPER};color:${INK};font-family:Georgia,'Times New Roman',serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CARD};border:1px solid ${LINE};border-radius:14px;overflow:hidden;">
      <tr><td style="padding:28px 32px 8px 32px;">
        ${eyebrow ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${ACCENT};margin-bottom:10px;">${esc(eyebrow)}</div>` : ""}
        <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:normal;color:${INK};">${heading}</h1>
      </td></tr>
      <tr><td style="padding:12px 32px 30px 32px;font-size:15px;line-height:1.65;color:${INK};">
        ${bodyHtml}
      </td></tr>
    </table>
    <div style="max-width:560px;margin:18px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTE};">
      47 Sketch — original artwork, hand-made and one-of-one.
    </div>
  </td></tr>
</table>
</body>
</html>`;
}

function itemsTable(items = []) {
  const rows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};">
          ${esc(it.title)} <span style="color:${MUTE};">× ${Number(it.qty || 1)}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK};text-align:right;white-space:nowrap;">
          ${money((it.price || 0) * (it.qty || 1))}
        </td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;">${rows}</table>`;
}

function totalRow(label, value, strong = false) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    <tr>
      <td style="font-size:${strong ? "16px" : "14px"};color:${strong ? INK : MUTE};${strong ? "font-weight:bold;" : ""}">${esc(label)}</td>
      <td style="font-size:${strong ? "16px" : "14px"};color:${INK};text-align:right;${strong ? "font-weight:bold;" : ""}">${value}</td>
    </tr>
  </table>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;"><tr><td style="border-radius:999px;background:${INK};">
    <a href="${esc(href)}" style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:.04em;color:#fff;text-decoration:none;border-radius:999px;">${esc(label)}</a>
  </td></tr></table>`;
}

// Renders the manual-payment instructions block from site settings.
function paymentBlock(settings) {
  const pay = settings?.payment || {};
  const methods = Array.isArray(pay.methods) ? pay.methods : [];
  if (!methods.length && !pay.whatsapp && !pay.instructions) return "";

  const methodHtml = methods
    .map((m) => {
      const lines = [
        m.accountName && `<div><span style="color:${MUTE};">Account name</span> — ${esc(m.accountName)}</div>`,
        m.accountNumber && `<div><span style="color:${MUTE};">Account number</span> — <strong>${esc(m.accountNumber)}</strong></div>`,
        m.extra && `<div><span style="color:${MUTE};">Note</span> — ${esc(m.extra)}</div>`,
      ]
        .filter(Boolean)
        .join("");
      return `<div style="padding:12px 14px;border:1px solid ${LINE};border-radius:10px;margin-bottom:10px;font-size:13px;line-height:1.6;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${ACCENT};margin-bottom:4px;">${esc(m.label)}</div>
        ${lines}
      </div>`;
    })
    .join("");

  const wa = (pay.whatsapp || "").replace(/[^\d]/g, "");
  const waHtml = pay.whatsapp
    ? `<p style="margin:12px 0 0;font-size:14px;">Send your payment screenshot on WhatsApp to <strong>${esc(pay.whatsapp)}</strong>${
        wa ? ` — <a href="https://wa.me/${wa}" style="color:${INK};">open chat</a>` : ""
      }.</p>`
    : "";

  return `<div style="margin-top:22px;padding-top:20px;border-top:1px solid ${LINE};">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${ACCENT};margin-bottom:10px;">How to pay</div>
    ${pay.instructions ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${MUTE};">${esc(pay.instructions)}</p>` : ""}
    ${methodHtml}
    ${waHtml}
  </div>`;
}

function customerLines(c = {}) {
  return [
    c.name && `Name: ${c.name}`,
    c.email && `Email: ${c.email}`,
    c.phone && `Phone: ${c.phone}`,
    c.address && `Address: ${[c.address, c.city, c.country].filter(Boolean).join(", ")}`,
    c.notes && `Notes: ${c.notes}`,
  ].filter(Boolean);
}

function itemsText(items = []) {
  return items.map((it) => `  • ${it.title} × ${it.qty} — ${money((it.price || 0) * (it.qty || 1))}`).join("\n");
}

// ---------- 1. Customer: order received (awaiting payment) ----------

export function orderConfirmationEmail(order, settings, storeUrl) {
  const trackUrl = `${storeUrl}/order/${encodeURIComponent(order.ref)}?email=${encodeURIComponent(order.customer?.email || "")}`;
  const name = order.customer?.name?.split(" ")[0] || "there";

  const html = layout({
    preheader: `Order ${order.ref} received — complete your payment to confirm.`,
    eyebrow: `Order ${order.ref}`,
    heading: "Thank you — we've got your order.",
    bodyHtml: `
      <p style="margin:0 0 14px;">Hi ${esc(name)}, your order is in. It's reserved for you while we wait for payment. Once we verify it, you'll get a confirmation email.</p>
      ${itemsTable(order.items)}
      ${totalRow("Total", money(order.total), true)}
      ${order.paymentMethod ? `<p style="margin:14px 0 0;font-size:13px;color:${MUTE};">Paying with: ${esc(order.paymentMethod)}</p>` : ""}
      ${paymentBlock(settings)}
      ${button(trackUrl, "Track your order")}
      <p style="margin:16px 0 0;font-size:13px;color:${MUTE};">Your reference is <strong>${esc(order.ref)}</strong> — keep it handy.</p>
    `,
  });

  const text = [
    `Thank you — we've got your order.`,
    ``,
    `Hi ${name}, your order ${order.ref} is in and reserved while we await payment.`,
    ``,
    `Items:`,
    itemsText(order.items),
    ``,
    `Total: ${money(order.total)}`,
    order.paymentMethod ? `Paying with: ${order.paymentMethod}` : "",
    ``,
    settings?.payment?.instructions ? `How to pay: ${settings.payment.instructions}` : "",
    settings?.payment?.whatsapp ? `Send your payment screenshot on WhatsApp to ${settings.payment.whatsapp}.` : "",
    ``,
    `Track your order: ${trackUrl}`,
    `Reference: ${order.ref}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return { subject: `Order ${order.ref} received — 47 Sketch`, html, text };
}

// ---------- 2. Customer: status update (confirmed / cancelled) ----------

export function orderStatusEmail(order, settings, storeUrl) {
  const trackUrl = `${storeUrl}/order/${encodeURIComponent(order.ref)}?email=${encodeURIComponent(order.customer?.email || "")}`;
  const name = order.customer?.name?.split(" ")[0] || "there";

  const COPY = {
    confirmed: {
      eyebrow: `Order ${order.ref}`,
      heading: "Your order is confirmed.",
      lead: `Hi ${esc(name)}, your payment has been verified — your order is confirmed and being prepared. Thank you for supporting the work.`,
      subject: `Order ${order.ref} confirmed — 47 Sketch`,
    },
    cancelled: {
      eyebrow: `Order ${order.ref}`,
      heading: "Your order was cancelled.",
      lead: `Hi ${esc(name)}, this order has been cancelled and the pieces are released. If this was a mistake, just reply to this email and we'll sort it out.`,
      subject: `Order ${order.ref} cancelled — 47 Sketch`,
    },
  };
  const c = COPY[order.status] || COPY.confirmed;

  const html = layout({
    preheader: c.lead.replace(/<[^>]+>/g, ""),
    eyebrow: c.eyebrow,
    heading: c.heading,
    bodyHtml: `
      <p style="margin:0 0 14px;">${c.lead}</p>
      ${itemsTable(order.items)}
      ${totalRow("Total", money(order.total), true)}
      ${button(trackUrl, "View your order")}
    `,
  });

  const text = [
    c.heading,
    ``,
    c.lead.replace(/<[^>]+>/g, ""),
    ``,
    `Items:`,
    itemsText(order.items),
    ``,
    `Total: ${money(order.total)}`,
    ``,
    `View your order: ${trackUrl}`,
  ].join("\n");

  return { subject: c.subject, html, text };
}

// ---------- 3. Owner: new-order alert ----------

export function ownerNewOrderEmail(order, storeUrl) {
  const c = order.customer || {};
  const contactRows = customerLines(c)
    .map((l) => {
      const [label, ...rest] = l.split(": ");
      return `<div style="font-size:14px;line-height:1.7;"><span style="color:${MUTE};">${esc(label)}</span> — ${esc(rest.join(": "))}</div>`;
    })
    .join("");

  const html = layout({
    preheader: `New order ${order.ref} — ${money(order.total)} from ${c.name || "a customer"}.`,
    eyebrow: "New order",
    heading: `${money(order.total)} · ${esc(order.ref)}`,
    bodyHtml: `
      <p style="margin:0 0 14px;">You've got a new order awaiting payment verification.</p>
      ${itemsTable(order.items)}
      ${totalRow("Total", money(order.total), true)}
      <div style="margin-top:22px;padding-top:18px;border-top:1px solid ${LINE};">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${ACCENT};margin-bottom:8px;">Customer</div>
        ${contactRows}
        ${order.paymentMethod ? `<div style="font-size:14px;line-height:1.7;margin-top:6px;"><span style="color:${MUTE};">Paying with</span> — ${esc(order.paymentMethod)}</div>` : ""}
      </div>
      ${button(`${storeUrl}/admin/orders`, "Open admin · orders")}
    `,
  });

  const text = [
    `New order — ${order.ref}`,
    ``,
    `Total: ${money(order.total)}`,
    ``,
    `Items:`,
    itemsText(order.items),
    ``,
    `Customer:`,
    ...customerLines(c).map((l) => `  ${l}`),
    order.paymentMethod ? `  Paying with: ${order.paymentMethod}` : "",
    ``,
    `Manage: ${storeUrl}/admin/orders`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return { subject: `New order ${order.ref} · ${money(order.total)}`, html, text };
}

// ---------- Commissions ----------

function commissionRows(c) {
  return [
    ["Name", c.name],
    ["Email", c.email],
    ["Phone", c.phone],
    ["Subject", c.subject],
    ["Budget", c.budget],
    ["Deadline", c.deadline],
  ].filter(([, v]) => v && String(v).trim());
}

// To the owner: someone requested a commission.
export function ownerCommissionEmail(commission, storeUrl) {
  const rows = commissionRows(commission)
    .map(
      ([label, val]) =>
        `<div style="font-size:14px;line-height:1.7;"><span style="color:${MUTE};">${esc(label)}</span> — ${esc(val)}</div>`
    )
    .join("");

  const html = layout({
    preheader: `New commission request from ${commission.name}.`,
    eyebrow: `Commission ${commission.ref}`,
    heading: "New commission request.",
    bodyHtml: `
      <p style="margin:0 0 14px;">Someone wants you to draw something for them.</p>
      <div style="padding:14px 16px;border:1px solid ${LINE};border-radius:10px;">${rows}</div>
      ${
        commission.message
          ? `<div style="margin-top:16px;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${ACCENT};margin-bottom:6px;">Their message</div><p style="margin:0;font-size:14px;line-height:1.65;white-space:pre-wrap;">${esc(commission.message)}</p></div>`
          : ""
      }
      ${button(`mailto:${esc(commission.email)}`, "Reply by email")}
    `,
  });

  const text = [
    `New commission request — ${commission.ref}`,
    ``,
    ...commissionRows(commission).map(([l, v]) => `${l}: ${v}`),
    ``,
    commission.message ? `Message:\n${commission.message}` : "",
    ``,
    `Reply to: ${commission.email}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return { subject: `New commission ${commission.ref} · ${commission.name}`, html, text };
}

// To the requester: we got your request.
export function commissionConfirmationEmail(commission) {
  const name = commission.name?.split(" ")[0] || "there";
  const html = layout({
    preheader: `Thanks ${name} — your commission request reached the studio.`,
    eyebrow: `Commission ${commission.ref}`,
    heading: "Thanks — your request is in.",
    bodyHtml: `
      <p style="margin:0 0 14px;">Hi ${esc(name)}, thank you for your commission request. I read every one personally and will get back to you at this email to talk through the piece, timing, and price.</p>
      ${commission.subject ? `<p style="margin:0 0 8px;font-size:14px;color:${MUTE};">What you asked for: <span style="color:${INK};">${esc(commission.subject)}</span></p>` : ""}
      <p style="margin:14px 0 0;font-size:13px;color:${MUTE};">Reference: <strong>${esc(commission.ref)}</strong></p>
    `,
  });
  const text = [
    `Thanks — your commission request is in.`,
    ``,
    `Hi ${name}, thank you for your request. I'll get back to you at this email to talk through the piece, timing, and price.`,
    commission.subject ? `\nWhat you asked for: ${commission.subject}` : "",
    ``,
    `Reference: ${commission.ref}`,
  ]
    .filter((l) => l !== "")
    .join("\n");
  return { subject: `Commission request received — 47 Sketch`, html, text };
}
