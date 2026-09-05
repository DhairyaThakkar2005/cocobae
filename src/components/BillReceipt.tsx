import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { THEME } from "../theme/tokens";
import { Order } from "../db/orders";
import { formatINR } from "../lib/utils";
import { Printer, Share2, ArrowLeft, CheckCircle2, QrCode } from "../lib/icons";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { useBreakpoint } from "../theme/breakpoints";

export interface BillReceiptProps {
  order: Order;
  cafeName?: string;
  upiId?: string;
  onNewOrder: () => void;
}

export const BillReceipt: React.FC<BillReceiptProps> = ({
  order,
  cafeName = "CocoBae Dessert Café",
  upiId = "cocobae@upi",
  onNewOrder,
}) => {
  const { isTablet, width } = useBreakpoint();

  // Generate UPI Payment URI for customer scanning
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    cafeName,
  )}&am=${order.total_amount}&cu=INR&tn=Order_${order.order_number}`;

  const formattedDate = new Date(order.order_date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Handle thermal Bluetooth print / system print
  const handlePrint = async () => {
    try {
      const itemsHtml = (order.items || [])
        .map(
          (it) => `
          <tr style="border-bottom: 1px dashed #ccc;">
            <td style="padding: 6px 0; font-size: 13px;">${it.product_name} x${it.quantity}</td>
            <td style="padding: 6px 0; text-align: right; font-size: 13px;">₹${it.subtotal}</td>
          </tr>
        `,
        )
        .join("");

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Courier New', monospace; padding: 20px; color: #000; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              table { width: 100%; border-collapse: collapse; }
            </style>
          </head>
          <body>
            <div class="center">
              <h2 style="margin: 0;">${cafeName}</h2>
              <p style="margin: 4px 0; font-size: 12px;">Dessert & Treats POS</p>
              <div class="divider"></div>
              <p style="margin: 2px 0; font-size: 12px;">Order #: <b>${order.order_number}</b></p>
              <p style="margin: 2px 0; font-size: 11px;">${formattedDate}</p>
              <p style="margin: 2px 0; font-size: 11px;">Payment: <b>${order.payment_method.toUpperCase()}</b></p>
            </div>
            <div class="divider"></div>
            <table>
              <thead>
                <tr style="border-bottom: 1px dashed #000;">
                  <th style="text-align: left; padding-bottom: 4px;">Item</th>
                  <th style="text-align: right; padding-bottom: 4px;">Amt</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="divider"></div>
            <table>
              ${
                order.gst_amount > 0
                  ? `<tr>
                      <td>GST:</td>
                      <td style="text-align: right;">₹${order.gst_amount}</td>
                    </tr>`
                  : ""
              }
              <tr style="font-size: 16px; font-weight: bold;">
                <td style="padding-top: 6px;">TOTAL:</td>
                <td style="text-align: right; padding-top: 6px;">₹${order.total_amount}</td>
              </tr>
            </table>
            <div class="divider"></div>
            <div class="center" style="margin-top: 15px;">
              <p style="font-size: 11px; margin: 0;">UPI: ${upiId}</p>
              <p style="font-size: 12px; margin-top: 8px;">Thank You! Visit Again 🍨</p>
            </div>
          </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert(
        "Print Notice",
        "Thermal Printer / Print Service: " + (e.message || "Ready"),
      );
    }
  };

  // Handle PDF Export and Sharing
  const handleSharePdf = async () => {
    try {
      const itemsHtml = (order.items || [])
        .map(
          (it) => `
          <tr>
            <td style="padding: 8px;">${it.product_name}</td>
            <td style="padding: 8px; text-align: center;">${it.quantity}</td>
            <td style="padding: 8px; text-align: right;">₹${it.unit_price}</td>
            <td style="padding: 8px; text-align: right;">₹${it.subtotal}</td>
          </tr>
        `,
        )
        .join("");

      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 30px; background: #fff; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #3E1F00; margin: 0;">${cafeName}</h1>
              <p style="color: #777; margin: 5px 0;">Official Receipt • #${order.order_number}</p>
              <p style="color: #999; font-size: 12px;">${formattedDate}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background: #FFF3E0; border-bottom: 2px solid #F5A623;">
                  <th style="padding: 10px; text-align: left;">Item</th>
                  <th style="padding: 10px; text-align: center;">Qty</th>
                  <th style="padding: 10px; text-align: right;">Price</th>
                  <th style="padding: 10px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div style="margin-top: 30px; text-align: right;">
              ${order.gst_amount > 0 ? `<p style="font-size: 14px;">GST: ₹${order.gst_amount}</p>` : ""}
              <h2 style="color: #3E1F00; margin: 5px 0;">Grand Total: ₹${order.total_amount}</h2>
              <p style="color: #666; font-size: 13px;">Payment Method: <b>${order.payment_method.toUpperCase()}</b></p>
            </div>
            <div style="text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
              <p style="color: #F5A623; font-weight: bold;">Thank You for choosing CocoBae! 🍨</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      // Copy PDF to document/cache directory with a clean filename for Android FileProvider compatibility
      const baseDir =
        FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
      const cleanOrderNum = (order.order_number || "receipt").replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      const targetUri = `${baseDir}CocoBae_Receipt_${cleanOrderNum}.pdf`;

      try {
        await FileSystem.copyAsync({
          from: uri,
          to: targetUri,
        });
      } catch {
        // If copy fails, fallback to uri directly
      }

      const shareUri = targetUri.startsWith("file://")
        ? targetUri
        : `file://${targetUri}`;

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareUri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: `CocoBae Receipt #${order.order_number}`,
        });
      } else {
        Alert.alert("PDF Generated", `Receipt saved to: ${targetUri}`);
      }
    } catch (err: any) {
      Alert.alert("Share Error", err.message || "Could not share PDF");
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        alignItems: "center",
        paddingVertical: 20,
        paddingHorizontal: 16,
      }}
    >
      {/* Bill Card (Max 480px for neat receipt presentation) */}
      <View
        style={{
          width: isTablet ? Math.min(480, width - 48) : "100%",
          backgroundColor: THEME.colors.surface,
          borderRadius: THEME.radius.xl,
          borderWidth: 1,
          borderColor: THEME.colors.borderStrong,
          padding: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        {/* Success Icon + Header */}
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <CheckCircle2 size={44} color={THEME.colors.success} />
          <Text
            style={{
              color: THEME.colors.primary,
              fontSize: 22,
              fontWeight: "900",
              marginTop: 6,
            }}
          >
            {cafeName}
          </Text>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 12,
              fontWeight: "600",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Payment Receipt
          </Text>
        </View>

        <Separator />

        {/* Order Meta Info */}
        <View style={{ gap: 4, marginBottom: 8 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
              Order No:
            </Text>
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {order.order_number}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
              Date & Time:
            </Text>
            <Text style={{ color: THEME.colors.text, fontSize: 12 }}>
              {formattedDate}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
              Payment Method:
            </Text>
            <Text
              style={{
                color: THEME.colors.primary,
                fontSize: 12,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              {order.payment_method}
            </Text>
          </View>
          {order.customer_name ? (
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
                Customer:
              </Text>
              <Text style={{ color: THEME.colors.text, fontSize: 12 }}>
                {order.customer_name}
              </Text>
            </View>
          ) : null}
        </View>

        <Separator />

        {/* Itemized Table */}
        <View style={{ marginBottom: 12 }}>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Ordered Items
          </Text>

          {(order.items || []).map((it, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 5,
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: THEME.colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {it.product_name}
                </Text>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>
                  {it.quantity} × {formatINR(it.unit_price)}
                </Text>
              </View>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                {formatINR(it.subtotal)}
              </Text>
            </View>
          ))}
        </View>

        <Separator />

        {/* Totals */}
        <View style={{ gap: 4, marginBottom: 14 }}>
          {order.gst_amount > 0 ? (
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>
                GST Tax:
              </Text>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {formatINR(order.gst_amount)}
              </Text>
            </View>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 18,
                fontWeight: "800",
              }}
            >
              Grand Total:
            </Text>
            <Text
              style={{
                color: THEME.colors.primary,
                fontSize: 24,
                fontWeight: "900",
              }}
            >
              {formatINR(order.total_amount)}
            </Text>
          </View>
        </View>

        {/* UPI QR Code Area */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: THEME.radius.lg,
            padding: 14,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <QrCode size={16} color="#0F0A06" />
            <Text style={{ color: "#0F0A06", fontWeight: "800", fontSize: 13 }}>
              Scan to Pay via Any UPI App
            </Text>
          </View>

          <QRCode
            value={upiUri}
            size={isTablet ? 180 : 140}
            color="#0F0A06"
            backgroundColor="#FFFFFF"
          />

          <Text
            style={{
              color: "#666",
              fontSize: 11,
              marginTop: 8,
              fontWeight: "600",
            }}
          >
            UPI ID: {upiId}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: isTablet ? "row" : "column", gap: 8 }}>
            <Button
              onPress={handlePrint}
              variant="primary"
              style={{ flex: 1 }}
              icon={<Printer size={18} color={THEME.colors.textInverse} />}
            >
              Print Receipt
            </Button>
            <Button
              onPress={handleSharePdf}
              variant="secondary"
              style={{ flex: 1 }}
              icon={<Share2 size={18} color={THEME.colors.text} />}
            >
              Share PDF
            </Button>
          </View>

          <Button
            onPress={onNewOrder}
            variant="outline"
            style={{ marginTop: 4 }}
          >
            Start New Order
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};
