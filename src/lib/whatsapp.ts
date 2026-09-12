import { Linking, Alert } from "react-native";
import Share, { ShareSingleOptions } from "react-native-share";
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
 * Shares the PDF Invoice with the positive message attached directly to WhatsApp.
 * Uses react-native-share's shareSingle targetted to WhatsApp with the recipient's phone number,
 * so the PDF file and positive caption open directly in WhatsApp for that customer!
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

    const fileUrl = pdfPath.startsWith("file://") ? pdfPath : `file://${pdfPath}`;

    // 2. Direct WhatsApp Single-Client Share with PDF File + Message Caption + Customer Number
    try {
      const shareOptions = {
        title: `CocoBae Invoice #${order.order_number}`,
        message: positiveMessage,
        url: fileUrl,
        type: "application/pdf",
        social: Share.Social.WHATSAPP,
        whatsAppNumber: targetPhone,
      } as any;

      await Share.shareSingle(shareOptions);
      return true;
    } catch (shareErr) {
      // Fallback to open dialog with PDF file + message pre-filled
      try {
        await Share.open({
          title: `CocoBae Invoice #${order.order_number}`,
          message: positiveMessage,
          url: fileUrl,
          type: "application/pdf",
        });
        return true;
      } catch {
        const encodedText = encodeURIComponent(positiveMessage);
        const appScheme = `whatsapp://send?phone=${targetPhone}&text=${encodedText}`;
        await Linking.openURL(appScheme);
        return true;
      }
    }
  } catch (err: any) {
    Alert.alert("WhatsApp Notice", err.message || "Could not open WhatsApp.");
    return false;
  }
}

/**
 * Backward-compatible helper that triggers PDF + message sharing
 */
export async function openDirectCustomerWhatsApp(
  phoneNumber: string,
  order: Order,
  options: WhatsAppOrderMessageOptions = {},
): Promise<boolean> {
  return sendInvoicePdfViaWhatsApp(phoneNumber, order, options);
}
