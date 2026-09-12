import { Alert } from "react-native";
import * as Sharing from "expo-sharing";
import { Order } from "../db/orders";
import { generateInvoicePdf } from "./pdfInvoice";

export interface WhatsAppOrderMessageOptions {
  cafeName?: string;
  storePhone?: string;
  storeCity?: string;
  upiId?: string;
}

/**
 * Builds the exact warm positive brand message requested by the user.
 */
export function buildWhatsAppReceiptMessage(
  order: Order,
  options: WhatsAppOrderMessageOptions = {},
): string {
  const cafeName = options.cafeName || "CocoBae Dessert Café";

  return (
    `✨ *Thank you so much for visiting ${cafeName}!*\n` +
    `We hope our desserts brought a sweet smile to your day! Have a wonderful time and see you again soon for more delicious treats! 🍨🍫\n\n` +
    `_Warm regards,_\n` +
    `*Team ${cafeName}*`
  );
}

/**
 * Attaches the generated Invoice PDF directly into WhatsApp sharing flow
 * so the customer receives the PDF file along with the positive brand message.
 */
export async function sendInvoicePdfViaWhatsApp(
  phoneNumber: string,
  order: Order,
  options: WhatsAppOrderMessageOptions = {},
): Promise<boolean> {
  try {
    // 1. Generate the official branded Tax Invoice PDF
    const pdfPath = await generateInvoicePdf(order, {
      cafeName: options.cafeName,
      storePhone: options.storePhone,
      storeCity: options.storeCity,
      upiId: options.upiId,
    });

    const shareUri = pdfPath.startsWith("file://") ? pdfPath : `file://${pdfPath}`;

    // 2. Share the PDF document via native share intent to WhatsApp
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(shareUri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `Share Invoice #${order.order_number} to WhatsApp`,
      });
      return true;
    } else {
      Alert.alert("Notice", "Sharing is not available on this device.");
      return false;
    }
  } catch (err: any) {
    Alert.alert("Invoice Share Error", err.message || "Could not attach PDF invoice.");
    return false;
  }
}

/**
 * Backward-compatible helper
 */
export async function openDirectCustomerWhatsApp(
  phoneNumber: string,
  order: Order,
  options: WhatsAppOrderMessageOptions = {},
): Promise<boolean> {
  return sendInvoicePdfViaWhatsApp(phoneNumber, order, options);
}
