import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking } from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { THEME } from "../theme/tokens";
import { Order } from "../db/orders";
import { getSetting } from "../db/settings";
import { generateInvoicePdf, shareInvoicePdf } from "../lib/pdfInvoice";
import { formatINR } from "../lib/utils";
import {
  Printer,
  Share2,
  ArrowLeft,
  CheckCircle2,
  QrCode,
  Phone,
} from "../lib/icons";
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
  cafeName = "CocoBae",
  upiId = "7043338863m@pnb",
  onNewOrder,
}) => {
  const { isTablet, width } = useBreakpoint();
  const [storePhone, setStorePhone] = useState("7043338863");
  const [storeCity, setStoreCity] = useState("Vadodara");
  const [storeAddress, setStoreAddress] = useState(
    "GROUND FLOOR. SHOP NUMBER - 12, URBAN 01, NEAR DARSHANAM OXY, NEAR PANCHMUKHI HANUMANJI, VASNA BHAYLI ROAD , Bhayli , Vadodara",
  );

  useEffect(() => {
    getSetting("store_phone", "7043338863").then(setStorePhone);
    getSetting("store_city", "Vadodara").then(setStoreCity);
    getSetting(
      "store_address",
      "GROUND FLOOR. SHOP NUMBER - 12, URBAN 01, NEAR DARSHANAM OXY, NEAR PANCHMUKHI HANUMANJI, VASNA BHAYLI ROAD , Bhayli , Vadodara",
    ).then(setStoreAddress);
  }, []);

  // Generate UPI Payment URI for customer scanning
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    cafeName,
  )}&am=${order.total_amount}&cu=INR&tn=Order_${order.order_number}`;

  const formattedDate = new Date(order.order_date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Handle thermal Bluetooth print / system print (Matching Standard Thermal Bill Reference)
  const handlePrint = async () => {
    try {
      const itemsHtml = (order.items || [])
        .map(
          (it) => `
          <tr>
            <td style="padding: 4px 0; font-size: 13px; text-align: left;">${it.product_name}</td>
            <td style="padding: 4px 0; font-size: 13px; text-align: right;">${it.unit_price.toFixed(2)} x${it.quantity} ${it.subtotal.toFixed(2)}</td>
          </tr>
        `,
        )
        .join("");

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <style>
              @page {
                margin: 0;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                margin: 0;
                padding: 0;
                color: #000 !important;
              }
              html, body {
                width: 100%;
                max-width: 100%;
                margin: 0 auto;
                padding: 4px 6px 14px 4px;
                color: #000;
                background: #fff;
                font-family: 'Courier New', Courier, monospace;
                font-size: 13px;
                font-weight: 900;
                line-height: 1.3;
                -webkit-font-smoothing: none;
                text-rendering: geometricPrecision;
                -webkit-text-stroke: 0.45px #000;
                text-shadow: 0.25px 0 0 #000, -0.25px 0 0 #000;
              }
              h1, h2, h3, p, span, td, th, b, strong {
                -webkit-text-stroke: 0.45px #000;
                text-shadow: 0.25px 0 0 #000;
              }
              .receipt-wrapper {
                width: 100%;
                max-width: 100%;
                margin: 0 auto;
              }
              .center {
                text-align: center;
              }
              .bold {
                font-weight: 900;
              }
              .divider {
                border-top: 2px dashed #000;
                margin: 6px 0;
                width: 100%;
              }
              .heavy-divider {
                border-top: 3px double #000;
                margin: 7px 0;
                width: 100%;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
              }
              th {
                font-weight: 900;
                font-size: 12.5px;
                color: #000;
              }
              td {
                color: #000;
                font-weight: 900;
                word-wrap: break-word;
              }
            </style>
          </head>
          <body>
            <div class="receipt-wrapper">
              <div class="center">
                <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 0.5px;">${cafeName}</h1>
                <p style="margin: 3px 0 2px 0; font-size: 11px; font-weight: 700; line-height: 1.25;">${storeAddress}</p>
                <p style="margin: 2px 0; font-size: 12px; font-weight: 800;">${storeCity} &bull; Ph: ${storePhone}</p>
                <div style="margin: 4px auto; display: inline-block; border: 1.5px solid #000; padding: 1px 6px; border-radius: 3px; font-size: 10.5px; font-weight: 800; text-transform: uppercase;">
                  Official Tax Invoice
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 700; margin-top: 4px;">
                  <span>Inv: #${order.order_number}</span>
                  <span>${formattedDate}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 700; margin-top: 2px;">
                  <span>Cust: ${order.customer_name || "Walk-In"}</span>
                  ${order.customer_phone ? `<span>Ph: ${order.customer_phone}</span>` : `<span>Pay: ${(order.payment_method || "UPI").toUpperCase()}</span>`}
                </div>
              </div>

              <div class="divider"></div>

              <table>
                <thead>
                  <tr style="border-bottom: 1.5px solid #000;">
                    <th style="text-align: left; padding: 3px 0; width: 44%;">Item</th>
                    <th style="text-align: center; padding: 3px 0; width: 14%;">Qty</th>
                    <th style="text-align: right; padding: 3px 0; width: 21%;">Price</th>
                    <th style="text-align: right; padding: 3px 0; width: 21%;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(order.items || [])
                    .map(
                      (it) => `
                    <tr>
                      <td style="padding: 4px 0; font-size: 12px; font-weight: 800; text-align: left;">${it.product_name}</td>
                      <td style="padding: 4px 0; font-size: 12px; font-weight: 800; text-align: center;">${it.quantity}</td>
                      <td style="padding: 4px 0; font-size: 12px; font-weight: 700; text-align: right;">${Math.round(it.unit_price)}</td>
                      <td style="padding: 4px 0; font-size: 12px; font-weight: 800; text-align: right;">${Math.round(it.subtotal)}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>

              <div class="divider"></div>

              <table>
                <tr>
                  <td style="padding: 3px 0; font-size: 13px; font-weight: 700;">Sub Total:</td>
                  <td style="text-align: right; padding: 3px 0; font-size: 13px; font-weight: 700;">Rs. ${Math.round(order.total_amount - (order.gst_amount || 0))}</td>
                </tr>
                ${
                  order.gst_amount > 0
                    ? `<tr>
                        <td style="padding: 3px 0; font-size: 13px; font-weight: 700;">GST Tax:</td>
                        <td style="text-align: right; padding: 3px 0; font-size: 13px; font-weight: 700;">Rs. ${Math.round(order.gst_amount)}</td>
                      </tr>`
                    : ""
                }
              </table>

              <div class="heavy-divider"></div>

              <table style="margin: 4px 0;">
                <tr style="font-size: 20px; font-weight: 900;">
                  <td style="letter-spacing: 0.5px;">TOTAL:</td>
                  <td style="text-align: right; font-size: 22px;">Rs. ${Math.round(order.total_amount)}</td>
                </tr>
              </table>

              <div class="heavy-divider"></div>

              <div class="center" style="margin-top: 8px;">
                <p style="font-size: 13px; font-weight: 900; margin-bottom: 6px; letter-spacing: 0.5px;">SCAN TO PAY VIA ANY UPI APP</p>
                <img src="${qrCodeUrl}" width="160" height="160" style="margin: 0 auto; display: block;" />
                <p style="font-size: 12px; margin: 6px 0 2px 0; font-weight: 800;">UPI ID: ${upiId}</p>
                <p style="font-size: 13px; margin: 8px 0 2px 0; font-weight: 800;">Thanks for visiting CocoBae!</p>
                <p style="font-size: 12px; margin: 0 0 4px 0; font-weight: 600;">Visit Again Soon &#127848;</p>
                <p style="font-size: 11px; margin-top: 6px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Powered by CocoBae</p>
              </div>
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
          <tr style="border-bottom: 1px dashed #ddd;">
            <td style="padding: 8px 4px; font-size: 13px;">${it.product_name}</td>
            <td style="padding: 8px 4px; text-align: right; font-size: 13px;">${Math.round(it.unit_price)} x${it.quantity} &nbsp; <b>₹${Math.round(it.subtotal)}</b></td>
          </tr>
        `,
        )
        .join("");

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`;

      const html = `
        <html>
          <body style="font-family: 'Courier New', monospace; padding: 30px; background: #fff; color: #111; max-width: 480px; margin: 0 auto;">
            <div style="text-align: center; border-bottom: 2px dashed #333; padding-bottom: 12px;">
              <h1 style="color: #0F0A06; margin: 0; font-size: 22px; font-weight: 900;">${cafeName}</h1>
              <p style="color: #444; margin: 3px auto; font-size: 11px; max-width: 360px; line-height: 1.3;">${storeAddress}</p>
              <p style="color: #555; margin: 2px 0; font-size: 12px;">${storeCity} • Contact: ${storePhone}</p>
              <p style="color: #333; margin: 4px 0; font-size: 12px;">Invoice ID: <b>${order.order_number}</b></p>
              <p style="color: #666; font-size: 11px; margin: 2px 0;">Order Time: ${formattedDate}</p>
              <p style="color: #333; font-size: 12px; margin: 2px 0;">Customer Name: <b>${order.customer_name || "Walk In Customer"}</b></p>
              ${order.customer_phone ? `<p style="color: #333; font-size: 12px; margin: 2px 0;">Mobile: <b>+91 ${order.customer_phone}</b></p>` : ""}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="border-bottom: 1px dashed #333;">
                  <th style="padding: 8px 4px; text-align: left; font-size: 13px;">Items</th>
                  <th style="padding: 8px 4px; text-align: right; font-size: 13px;">Price Qty Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="margin-top: 14px; border-top: 1px dashed #333; padding-top: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                <span>Sub Total:</span>
                <span>Rs. ${Math.round(order.total_amount - (order.gst_amount || 0))}</span>
              </div>
              ${
                order.gst_amount > 0
                  ? `<div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                      <span>GST:</span>
                      <span>Rs. ${Math.round(order.gst_amount)}</span>
                    </div>`
                  : ""
              }
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 8px 0; margin-top: 8px;">
                <span>Total Rs :</span>
                <span>${Math.round(order.total_amount)}</span>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <p style="font-size: 13px; font-weight: bold; margin: 4px 0;">Scan to Pay</p>
              <img src="${qrCodeUrl}" width="140" height="140" style="margin: 8px auto; display: block;" />
              <p style="font-size: 11px; color: #555; margin: 4px 0;">UPI ID: ${upiId}</p>
              <p style="font-size: 13px; font-weight: bold; margin: 10px 0 2px 0;">Thanks for purchasing!</p>
              <p style="font-size: 12px; margin: 0 0 6px 0;">Visit Again Soon 🍨</p>
              <p style="font-size: 11px; margin-top: 12px; font-weight: bold; letter-spacing: 0.5px; border-top: 1px dashed #eee; padding-top: 10px;">Powered by CocoBae</p>
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
              fontSize: 11,
              textAlign: "center",
              lineHeight: 15,
              marginTop: 2,
              paddingHorizontal: 8,
            }}
          >
            {storeAddress}
          </Text>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 12,
              fontWeight: "600",
              letterSpacing: 0.5,
              marginTop: 2,
            }}
          >
            {storeCity} • Contact: {storePhone}
          </Text>
          <Text
            style={{
              color: THEME.colors.primary,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            Official Tax Invoice
          </Text>
        </View>

        <Separator />

        {/* Order Meta Info */}
        <View style={{ gap: 4, marginBottom: 8 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
              Invoice ID:
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
              Order Time:
            </Text>
            <Text style={{ color: THEME.colors.text, fontSize: 12 }}>
              {formattedDate}
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
              Customer:
            </Text>
            <Text style={{ color: THEME.colors.text, fontSize: 12, fontWeight: "600" }}>
              {order.customer_name || "Walk In Customer"}
            </Text>
          </View>
          {order.customer_phone ? (
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
                Mobile:
              </Text>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                +91 {order.customer_phone}
              </Text>
            </View>
          ) : null}
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
              Payment:
            </Text>
            <Text
              style={{
                color: THEME.colors.primary,
                fontSize: 12,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              {order.payment_method} (PAID)
            </Text>
          </View>
        </View>

        <Separator />

        {/* Itemized Table */}
        <View style={{ marginBottom: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: THEME.colors.border,
              paddingBottom: 4,
            }}
          >
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 11,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              Items
            </Text>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 11,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              Price  Qty  Total
            </Text>
          </View>

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
              </View>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {it.unit_price} x{it.quantity} &nbsp; {formatINR(it.subtotal)}
              </Text>
            </View>
          ))}
        </View>

        <Separator />

        {/* Totals */}
        <View style={{ gap: 4, marginBottom: 14 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>
              Sub Total:
            </Text>
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {formatINR(order.total_amount - (order.gst_amount || 0))}
            </Text>
          </View>

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
              borderTopWidth: 2,
              borderBottomWidth: 2,
              borderColor: THEME.colors.borderStrong,
              paddingVertical: 8,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 17,
                fontWeight: "800",
              }}
            >
              Total Rs :
            </Text>
            <Text
              style={{
                color: THEME.colors.primary,
                fontSize: 22,
                fontWeight: "900",
              }}
            >
              {formatINR(order.total_amount)}
            </Text>
          </View>
        </View>

        {/* Dynamic UPI QR Code Area */}
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
          <Text
            style={{
              color: "#333",
              fontSize: 12,
              marginTop: 6,
              fontWeight: "700",
            }}
          >
            Thanks for purchasing!
          </Text>
          <Text
            style={{
              color: "#666",
              fontSize: 11,
            }}
          >
            Visit Again Soon 🍨
          </Text>
          <Text
            style={{
              color: "#888",
              fontSize: 10,
              fontWeight: "700",
              marginTop: 6,
              letterSpacing: 0.5,
            }}
          >
            Powered by CocoBae
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
