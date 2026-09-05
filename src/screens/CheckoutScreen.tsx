import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { THEME } from "../theme/tokens";
import { useCartStore } from "../store/cartStore";
import { createOrder, Order } from "../db/orders";
import { formatINR } from "../lib/utils";
import {
  ArrowLeft,
  Banknote,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Receipt,
  Cake,
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
      clearCart();
      onOrderPlaced(created);
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
