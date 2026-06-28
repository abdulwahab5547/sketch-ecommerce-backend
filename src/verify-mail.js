// One-off: verify SMTP auth and send a sample of each email to the owner.
// Run with:  node src/verify-mail.js
import "dotenv/config";
import nodemailer from "nodemailer";
import { sendMail, mailConfigured } from "./lib/mailer.js";
import {
  orderConfirmationEmail,
  orderStatusEmail,
  ownerNewOrderEmail,
} from "./lib/emails.js";

const to = process.env.OWNER_EMAIL || process.env.MAIL_USER;
const storeUrl = (process.env.STORE_URL || "http://localhost:5173").replace(/\/+$/, "");

const sampleOrder = {
  ref: "ZI-SAMPLE",
  status: "pending",
  paymentMethod: "Bank transfer",
  subtotal: 18500,
  total: 18500,
  customer: {
    name: "Ayesha Khan",
    email: to,
    phone: "+92 300 1234567",
    address: "12 Clifton Block 4",
    city: "Karachi",
    country: "Pakistan",
    notes: "Please pack it well!",
  },
  items: [
    { title: "Ezio — Brotherhood No. 1", price: 12000, qty: 1 },
    { title: "Hooded Profile Study", price: 6500, qty: 1 },
  ],
};

const sampleSettings = {
  payment: {
    instructions: "Pay via any method below, then send your screenshot on WhatsApp to confirm.",
    whatsapp: "+92 300 1234567",
    methods: [
      { label: "Bank transfer", accountName: "Zaid Ikram", accountNumber: "PK00 1234 5678 9012", extra: "Meezan Bank" },
      { label: "JazzCash", accountName: "Zaid Ikram", accountNumber: "0300 1234567", extra: "" },
    ],
  },
};

async function main() {
  console.log("Mail configured:", mailConfigured());
  if (!mailConfigured()) {
    console.error("MAIL_USER / MAIL_PASS missing — aborting.");
    process.exit(1);
  }

  // 1) Prove the credentials/connection are valid.
  const t = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.MAIL_USER, pass: (process.env.MAIL_PASS || "").replace(/\s+/g, "") },
  });
  await t.verify();
  console.log("✓ SMTP auth verified — Gmail accepted the app password.\n");

  // 2) Send one of each template so they can be eyeballed in the inbox.
  const confirmed = { ...sampleOrder, status: "confirmed" };

  const a = orderConfirmationEmail(sampleOrder, sampleSettings, storeUrl);
  const b = ownerNewOrderEmail(sampleOrder, storeUrl);
  const c = orderStatusEmail(confirmed, sampleSettings, storeUrl);

  const r1 = await sendMail({ to, ...a, subject: `[SAMPLE] ${a.subject}` });
  const r2 = await sendMail({ to, ...b, subject: `[SAMPLE] ${b.subject}` });
  const r3 = await sendMail({ to, ...c, subject: `[SAMPLE] ${c.subject}` });

  console.log("\nResults:", { customerConfirmation: r1, ownerAlert: r2, statusUpdate: r3 });
  console.log(`All three samples sent to ${to}. Check the inbox.`);
  process.exit(r1 && r2 && r3 ? 0 : 1);
}

main().catch((e) => {
  console.error("verify-mail failed:", e);
  process.exit(1);
});
