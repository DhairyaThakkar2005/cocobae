import { Linking, Alert } from "react-native";
import { Order } from "../db/orders";
import { formatINR } from "./utils";

export interface WhatsAppOrderMessageOptions {
  cafeName?: string;
  storePhone?: string;
  storeCity?: string;
}

/**
 * Builds a friendly, positive, high-conversion WhatsApp invoice receipt message.
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
 * Opens customer's WhatsApp chat directly with a pre-filled positive paragraph message.
 * Formats Indian 10-digit mobile numbers with international country prefix 91 automatically.
 */
export async function openDirectCustomerWhatsApp(
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

  // Ensure 91 country code prefix for WhatsApp universal link
  const targetPhone =
    rawPhone.length === 10
      ? `91${rawPhone}`
      : rawPhone.startsWith("0") && rawPhone.length === 11
        ? `91${rawPhone.slice(1)}`
        : rawPhone;

  const textMessage = buildWhatsAppReceiptMessage(order, options);
  const encodedText = encodeURIComponent(textMessage);

  // 1. Direct App Scheme (Opens directly in WhatsApp without browser intermediary)
  const appScheme = `whatsapp://send?phone=${targetPhone}&text=${encodedText}`;
  // 2. Universal Web Fallback (Official WhatsApp API)
  const webScheme = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;

  try {
    const canOpen = await Linking.canOpenURL(appScheme);
    if (canOpen) {
      await Linking.openURL(appScheme);
      return true;
    } else {
      await Linking.openURL(webScheme);
      return true;
    }
  } catch (err: any) {
    try {
      await Linking.openURL(webScheme);
      return true;
    } catch (fallbackErr: any) {
      Alert.alert(
        "WhatsApp Notice",
        "Could not open WhatsApp directly. Please ensure WhatsApp is installed on this phone.",
      );
      return false;
    }
  }
}
