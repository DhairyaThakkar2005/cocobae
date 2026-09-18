import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Order } from "../db/orders";

export interface InvoiceOptions {
  cafeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeCity?: string;
  upiId?: string;
}

/**
 * Generates an exact branded receipt invoice PDF matching the standard template.
 * Saves the file to cache directory with clean name: CocoBae_Invoice_<orderNumber>.pdf
 * Returns the file URI.
 */
export async function generateInvoicePdf(
  order: Order,
  options: InvoiceOptions = {},
): Promise<string> {
  const cafeName = options.cafeName || "CocoBae";
  const storeAddress =
    options.storeAddress ||
    "GROUND FLOOR. SHOP NUMBER - 12, URBAN 01, NEAR DARSHANAM OXY, NEAR PANCHMUKHI HANUMANJI, VASNA BHAYLI ROAD , Bhayli , Vadodara";
  const storePhone = options.storePhone || "7043338863";
  const storeCity = options.storeCity || "Vadodara";
  const upiId = options.upiId || "7043338863m@pnb";

  const formattedDate = new Date(order.order_date || Date.now()).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );

  const itemsHtml = (order.items || [])
    .map(
      (it) => `
      <tr style="border-bottom: 1px dashed #ddd;">
        <td style="padding: 7px 4px; font-size: 13px;">${it.product_name}</td>
        <td style="padding: 7px 4px; text-align: right; font-size: 13px;">${Math.round(it.unit_price)} x${it.quantity} &nbsp; <b>₹${Math.round(it.subtotal)}</b></td>
      </tr>
    `,
    )
    .join("");

  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    cafeName,
  )}&am=${order.total_amount}&cu=INR&tn=Order_${order.order_number}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    upiUri,
  )}`;

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 24px;
            background: #ffffff;
            color: #111111;
            max-width: 440px;
            margin: 0 auto;
          }
          .divider {
            border-bottom: 1px dashed #444;
            margin: 8px 0;
          }
          .heavy-divider {
            border-bottom: 2px dashed #000;
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div style="text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px;">
          <h1 style="color: #0F0A06; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 0.5px;">${cafeName}</h1>
          <p style="color: #444; margin: 4px auto; font-size: 11px; max-width: 360px; line-height: 1.3;">${storeAddress}</p>
          <p style="color: #555; margin: 2px 0; font-size: 12px;">${storeCity} • Contact: ${storePhone}</p>
          <p style="color: #222; margin: 5px 0 2px 0; font-size: 13px;">Invoice ID: <b>${order.order_number}</b></p>
          <p style="color: #666; font-size: 11px; margin: 2px 0;">Order Time: ${formattedDate}</p>
          <p style="color: #222; font-size: 12px; margin: 3px 0;">Customer Name: <b>${order.customer_name || "Walk In Customer"}</b></p>
          ${order.customer_phone ? `<p style="color: #222; font-size: 12px; margin: 2px 0;">Mobile: <b>+91 ${order.customer_phone}</b></p>` : ""}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <thead>
            <tr style="border-bottom: 1px dashed #333;">
              <th style="padding: 6px 4px; text-align: left; font-size: 13px;">Items</th>
              <th style="padding: 6px 4px; text-align: right; font-size: 13px;">Price Qty Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-top: 12px; border-top: 1px dashed #333; padding-top: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
            <span>Sub Total:</span>
            <span>Rs. ${Math.round((order.items || []).reduce((acc, it) => acc + it.subtotal, 0))}</span>
          </div>
          ${
            order.discount_amount && order.discount_amount > 0
              ? `<div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; color: #b91c1c; font-weight: bold;">
                  <span>Discount ${order.discount_type === "percentage" ? `(${order.discount_value}%)` : ""}:</span>
                  <span>-Rs. ${Math.round(order.discount_amount)}</span>
                </div>`
              : ""
          }
          ${
            order.delivery_charge && order.delivery_charge > 0
              ? `<div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                  <span>${order.extra_charge_name || "Delivery Charge"}:</span>
                  <span>+Rs. ${Math.round(order.delivery_charge)}</span>
                </div>`
              : ""
          }
          ${
            order.gst_amount > 0
              ? `<div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                  <span>GST:</span>
                  <span>Rs. ${Math.round(order.gst_amount)}</span>
                </div>`
              : ""
          }
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 8px 0; margin-top: 6px;">
            <span>Total Rs :</span>
            <span>${Math.round(order.total_amount)}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 16px;">
          <p style="font-size: 13px; font-weight: bold; margin: 4px 0;">Scan to Pay</p>
          <img src="${qrCodeUrl}" width="140" height="140" style="margin: 6px auto; display: block;" />
          <p style="font-size: 11px; color: #555; margin: 4px 0;">UPI ID: ${upiId}</p>
          <p style="font-size: 13px; font-weight: bold; margin: 10px 0 2px 0;">Thanks for purchasing!</p>
          <p style="font-size: 12px; margin: 0 0 4px 0;">Visit Again Soon 🍨</p>
          <p style="font-size: 11px; margin-top: 10px; font-weight: bold; letter-spacing: 0.5px; border-top: 1px dashed #eee; padding-top: 8px;">Powered by CocoBae</p>
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  // Copy to cache/document folder with a readable file name for WhatsApp sharing
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
  const cleanOrderNum = (order.order_number || "receipt").replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
  const targetUri = `${baseDir}CocoBae_Invoice_${cleanOrderNum}.pdf`;

  try {
    await FileSystem.copyAsync({
      from: uri,
      to: targetUri,
    });
    return targetUri;
  } catch {
    return uri;
  }
}

/**
 * Shares the invoice PDF file directly using native share sheet / WhatsApp document intent.
 */
export async function shareInvoicePdf(
  pdfUri: string,
  orderNumber: string,
): Promise<boolean> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    return false;
  }

  const shareUri = pdfUri.startsWith("file://") ? pdfUri : `file://${pdfUri}`;
  await Sharing.shareAsync(shareUri, {
    UTI: ".pdf",
    mimeType: "application/pdf",
    dialogTitle: `Share CocoBae Invoice #${orderNumber} via WhatsApp`,
  });

  return true;
}