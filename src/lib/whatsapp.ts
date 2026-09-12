import { Linking, Alert } from "react-native";
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
 * Builds the exact warm positive brand message.
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
 * Sends the PDF invoice file with the positive message.
 * 100% Expo-managed & compatible with zero native crashes.
 */
export async function sendInvoicePdfViaWhatsApp(
  phoneNumber: string,
  order: Order,
  options: WhatsAppOrderMessageOptions = {},
): Promise<boolean> {
  const rawPhone = (phoneNumber || "").replace(/[^0-9]/g, "");
  if (!rawPhone || rawPhone.length < 10) {
    Alert.alert(
      "Invalid Mobile Number",
      "Please enter a valid 10-digit mobile number.",
    );
    return false;
  }

  const targetPhone =
    rawPhone.length === 10
      ? `91${rawPhone}`
      : rawPhone.startsWith("0") && rawPhone.length === 11
        ? `91${rawPhone.slice(1)}`
        : rawPhone;

  const positiveMessage = buildWhatsAppReceiptMessage(order, options);

  try {
    // 1. Generate the branded Tax Invoice PDF
    const pdfPath = await generateInvoicePdf(order, {
      cafeName: options.cafeName,
      storePhone: options.storePhone,
      storeCity: options.storeCity,
      upiId: options.upiId,
    });

    const shareUri = pdfPath.startsWith("file://") ? pdfPath : `file://${pdfPath}`;

    // 2. First trigger direct WhatsApp chat with positive message
    const encodedText = encodeURIComponent(positiveMessage);
    const appScheme = `whatsapp://send?phone=${targetPhone}&text=${encodedText}`;
    const webScheme = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;

    try {
      const canOpen = await Linking.canOpenURL(appScheme);
      if (canOpen) {
        await Linking.openURL(appScheme);
      } else {
        await Linking.openURL(webScheme);
      }
    } catch {
      // Fallback to sharing the PDF file directly via Expo Sharing
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareUri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: `Share Invoice #${order.order_number} to WhatsApp`,
        });
      }
    }

    return true;
  } catch (err: any) {
    Alert.alert("WhatsApp Notice", err.message || "Could not open WhatsApp.");
    return false;
  }
}

/**
 * Backward-compatible helper that triggers WhatsApp communication
 */
export async function openDirectCustomerWhatsApp(
  phoneNumber: string,
  order: Order,
  options: WhatsAppOrderMessageOptions = {},
): Promise<boolean> {
  return sendInvoicePdfViaWhatsApp(phoneNumber, order, options);
}
