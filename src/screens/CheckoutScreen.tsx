import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { THEME } from "../theme/tokens";
import { useCartStore } from "../store/cartStore";
import { createOrder, Order } from "../db/orders";
import { getAllSettings } from "../db/settings";
import { generateInvoicePdf, shareInvoicePdf } from "../lib/pdfInvoice";
import { formatINR } from "../lib/utils";
import {
  ArrowLeft,
  Banknote,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Receipt,
  Cake,
  Phone,
  MessageCircle,
  Sparkles,
  ChevronRight,
} from "../lib/icons";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { useBreakpoint } from "../theme/breakpoints";

export interface CheckoutScreenProps {
  onBack: () => void;
  onOrderPlaced: (order: Order) => void;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  onBack,
  onOrderPlaced,
}) => {
  const { isTablet, width } = useBreakpoint();
  const {
    items,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    orderNote,
    getTotalItemsCount,
    getSubtotal,
    getGstAmount,
    getGrandTotal,
    clearCart,
  } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">(
    "cash",
  );
  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<any>(null);

  const [storeSettings, setStoreSettings] = useState<{
    cafeName: string;
    storePhone: string;
    storeCity: string;
    upiId: string;
  }>({
    cafeName: "CocoBae Dessert Café",
    storePhone: "919999999999",
    storeCity: "Anand, Gujarat",
    upiId: "cocobae@upi",
  });

  useEffect(() => {
    if (!successOrder) return;
    setCountdown(5);
    let count = 5;
    timerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        onOrderPlaced(successOrder);
      } else {
        setCountdown(count);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [successOrder]);

  const handleSkipToReceipt = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (successOrder) {
      onOrderPlaced(successOrder);
    }
  };

  useEffect(() => {
    getAllSettings().then((s) => {
      setStoreSettings({
        cafeName: s.cafe_name || "CocoBae Dessert Café",
        storePhone: s.store_phone || "919999999999",
        storeCity: s.store_city || "Anand, Gujarat",
        upiId: s.upi_id || "cocobae@upi",
      });
    });
  }, []);

  const totalItems = getTotalItemsCount();
  const subtotal = getSubtotal();
  const gstAmount = getGstAmount();
  const grandTotal = getGrandTotal();

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert("Empty Order", "Please add items before placing order.");
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        order_number: "",
        order_date: "",
        total_amount: grandTotal,
        gst_amount: gstAmount,
        payment_method: paymentMethod,
        customer_name: customerName.trim() || "Guest",
        customer_phone: customerPhone.trim() || undefined,
        note: orderNote.trim(),
        status: "completed",
      };

      const itemsPayload = items.map((it) => ({
        product_id: it.product.id,
        product_name: it.product.name,
        quantity: it.quantity,
        unit_price: it.product.price,
        subtotal: it.subtotal,
      }));

      const created = await createOrder(orderPayload, itemsPayload);

      // Attach order items to created object for PDF generator
      created.items = itemsPayload;

      // Automated digital bill PDF delivery if phone number provided
      const rawPhone = customerPhone.replace(/[^0-9]/g, "");
      if (rawPhone.length >= 10) {
        try {
          const pdfUri = await generateInvoicePdf(created, {
            cafeName: storeSettings.cafeName,
            storePhone: storeSettings.storePhone,
            storeCity: storeSettings.storeCity,
            upiId: storeSettings.upiId,
          });

          await shareInvoicePdf(pdfUri, created.order_number);
        } catch (pdfErr) {
          console.warn("Could not auto-dispatch PDF invoice:", pdfErr);
        }
      }

      clearCart();
      setSuccessOrder(created);
    } catch (e: any) {
      Alert.alert("Order Error", e.message || "Failed to record order.");
    } finally {
      setLoading(false);
    }
  };

  const paymentOptions = [
    {
      id: "cash" as const,
      label: "Cash",
      desc: "Physical currency payment",
      icon: Banknote,
    },
    {
      id: "upi" as const,
      label: "UPI / QR",
      desc: "GPay, PhonePe, Paytm QR",
      icon: Smartphone,
    },
    {
      id: "card" as const,
      label: "Card / POS",
      desc: "Debit / Credit card swipe",
      icon: CreditCard,
    },
  ];

  // 5-Second Order Placed Celebration Screen
  if (successOrder) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: THEME.colors.bg,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: THEME.colors.surface,
            borderRadius: 28,
            borderWidth: 1.5,
            borderColor: THEME.colors.primary + "35",
            padding: 28,
            alignItems: "center",
            width: "100%",
            maxWidth: 420,
            shadowColor: THEME.colors.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.18,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          {/* Animated Glow Circle */}
          <View
            style={{
              width: 86,
              height: 86,
              borderRadius: 43,
              backgroundColor: "#10B98118",
              borderWidth: 2.5,
              borderColor: "#10B981",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <CheckCircle2 size={48} color="#10B981" />
          </View>

          {/* Heading */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <Sparkles size={20} color={THEME.colors.primary} />
            <Text
              style={{
                fontSize: 24,
                fontWeight: "900",
                color: THEME.colors.text,
                letterSpacing: 0.3,
                textAlign: "center",
              }}
            >
              Order Placed!
            </Text>
            <Sparkles size={20} color={THEME.colors.primary} />
          </View>

          <Text
            style={{
              fontSize: 13,
              color: THEME.colors.textMuted,
              textAlign: "center",
              marginBottom: 22,
            }}
          >
            Delicious dessert order recorded with love ✨
          </Text>

          {/* Order Details Card */}
          <View
            style={{
              backgroundColor: THEME.colors.surface2,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: THEME.colors.border,
              padding: 16,
              width: "100%",
              marginBottom: 20,
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                Order Number
              </Text>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                #{successOrder.order_number || String(successOrder.id).padStart(4, "0")}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                Amount Paid
              </Text>
              <Text
                style={{
                  color: THEME.colors.primary,
                  fontSize: 20,
                  fontWeight: "900",
                }}
              >
                {formatINR(successOrder.total_amount)}
              </Text>
            </View>

            <Separator />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                Payment Method
              </Text>
              <View
                style={{
                  backgroundColor: THEME.colors.primary + "20",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: THEME.colors.primary,
                    fontSize: 12,
                    fontWeight: "800",
                    textTransform: "uppercase",
                  }}
                >
                  {successOrder.payment_method}
                </Text>
              </View>
            </View>

            {successOrder.customer_name ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                  Customer
                </Text>
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {successOrder.customer_name}
                </Text>
              </View>
            ) : null}

            {successOrder.customer_phone ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                  Phone
                </Text>
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {successOrder.customer_phone}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Countdown & Redirect Info */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: THEME.colors.primary + "25",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1.5,
                borderColor: THEME.colors.primary,
              }}
            >
              <Text
                style={{
                  color: THEME.colors.primary,
                  fontSize: 15,
                  fontWeight: "900",
                }}
              >
                {countdown}
              </Text>
            </View>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              Opening bill receipt in {countdown}s...
            </Text>
          </View>

          {/* Quick Action Button to skip countdown */}
          <TouchableOpacity
            onPress={handleSkipToReceipt}
            activeOpacity={0.8}
            style={{
              backgroundColor: THEME.colors.primary,
              paddingVertical: 14,
              paddingHorizontal: 20,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
            }}
          >
            <Receipt size={18} color="#FFFFFF" />
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                fontSize: 15,
              }}
            >
              View Bill Receipt Now
            </Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.bg }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: THEME.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={20} color={THEME.colors.primary} />
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 18,
              fontWeight: "800",
            }}
          >
            Checkout & Pay
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: "center",
          padding: 16,
          paddingBottom: 40,
        }}
      >
        <View
          style={{
            width: isTablet ? Math.min(680, width - 48) : "100%",
            gap: 16,
          }}
        >
          {/* Customer Name Field */}
          <View
            style={{
              backgroundColor: THEME.colors.surface,
              borderRadius: THEME.radius.lg,
              borderWidth: 1,
              borderColor: THEME.colors.border,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 15,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              Customer Name / Table (Optional)
            </Text>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              Printed on the receipt for identification.
            </Text>
            <TextInput
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="e.g. John Doe / Table 2"
              placeholderTextColor={THEME.colors.textDisabled}
              style={{
                backgroundColor: THEME.colors.surface2,
                borderRadius: THEME.radius.md,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                color: THEME.colors.text,
                fontSize: 14,
                padding: 12,
              }}
            />
          </View>

          {/* Customer Mobile Number Field */}
          <View
            style={{
              backgroundColor: THEME.colors.surface,
              borderRadius: THEME.radius.lg,
              borderWidth: 1,
              borderColor: THEME.colors.border,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 15,
                  fontWeight: "700",
                  flexShrink: 1,
                }}
              >
                Customer Mobile Number (Optional)
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "rgba(37, 211, 102, 0.15)",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: THEME.radius.full,
                  borderWidth: 1,
                  borderColor: "rgba(37, 211, 102, 0.3)",
                  alignSelf: "flex-start",
                }}
              >
                <MessageCircle size={12} color="#25D366" />
                <Text
                  style={{
                    color: "#25D366",
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                >
                  WhatsApp Bill
                </Text>
              </View>
            </View>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              The digital invoice will automatically be sent to their WhatsApp.
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: THEME.colors.surface2,
                borderRadius: THEME.radius.md,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                paddingHorizontal: 12,
              }}
            >
              <Phone
                size={16}
                color={THEME.colors.primary}
                style={{ marginRight: 8 }}
              />
              <TextInput
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="e.g. 9876543210"
                placeholderTextColor={THEME.colors.textDisabled}
                keyboardType="phone-pad"
                maxLength={13}
                style={{
                  flex: 1,
                  color: THEME.colors.text,
                  fontSize: 14,
                  paddingVertical: 12,
                }}
              />
            </View>
          </View>

          {/* Payment Method Selector */}
          <View
            style={{
              backgroundColor: THEME.colors.surface,
              borderRadius: THEME.radius.lg,
              borderWidth: 1,
              borderColor: THEME.colors.border,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 15,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              Choose Payment Method
            </Text>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              Select how the customer is settling the bill.
            </Text>

            <View
              style={{
                flexDirection: isTablet ? "row" : "column",
                gap: 10,
              }}
            >
              {paymentOptions.map((opt) => {
                const isSelected = paymentMethod === opt.id;
                const IconComp = opt.icon;

                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setPaymentMethod(opt.id)}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      backgroundColor: isSelected
                        ? THEME.colors.primaryGlow
                        : THEME.colors.surface2,
                      borderColor: isSelected
                        ? THEME.colors.primary
                        : THEME.colors.border,
                      borderWidth: 1.5,
                      borderRadius: THEME.radius.md,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: isSelected
                          ? THEME.colors.primary
                          : THEME.colors.surface,
                        borderRadius: THEME.radius.full,
                        padding: 8,
                      }}
                    >
                      <IconComp
                        size={20}
                        color={
                          isSelected
                            ? THEME.colors.textInverse
                            : THEME.colors.textMuted
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: isSelected
                            ? THEME.colors.primary
                            : THEME.colors.text,
                          fontSize: 15,
                          fontWeight: "700",
                        }}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={{
                          color: THEME.colors.textMuted,
                          fontSize: 11,
                          marginTop: 1,
                        }}
                      >
                        {opt.desc}
                      </Text>
                    </View>
                    {isSelected ? (
                      <CheckCircle2 size={18} color={THEME.colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Compact Order Summary Card */}
          <View
            style={{
              backgroundColor: THEME.colors.surface,
              borderRadius: THEME.radius.lg,
              borderWidth: 1,
              borderColor: THEME.colors.border,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                Order Summary
              </Text>
              <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>
                {totalItems} items
              </Text>
            </View>

            {items.map((it) => (
              <View
                key={it.product.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 4,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 13,
                    flex: 1,
                    marginRight: 8,
                  }}
                >
                  {it.product.name} × {it.quantity}
                </Text>
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {formatINR(it.subtotal)}
                </Text>
              </View>
            ))}

            <Separator style={{ marginVertical: 10 }} />

            {gstAmount > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>
                  GST Tax
                </Text>
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {formatINR(gstAmount)}
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
                  fontSize: 17,
                  fontWeight: "800",
                }}
              >
                Total Payable:
              </Text>
              <Text
                style={{
                  color: THEME.colors.primary,
                  fontSize: 22,
                  fontWeight: "900",
                }}
              >
                {formatINR(grandTotal)}
              </Text>
            </View>
          </View>

          {/* Place Order CTA Button */}
          <Button
            onPress={handlePlaceOrder}
            loading={loading}
            size="lg"
            variant="primary"
            icon={<Cake size={20} color={THEME.colors.textInverse} />}
            style={{
              marginTop: 8,
              shadowColor: THEME.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            {`Place Order & Print Bill (${formatINR(grandTotal)})`}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};
