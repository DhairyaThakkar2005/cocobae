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
  Vibration,
} from "react-native";
import { THEME } from "../theme/tokens";
import { useCartStore } from "../store/cartStore";
import { createOrder, Order } from "../db/orders";
import { getAllSettings } from "../db/settings";
import { Offer, getActiveOffers, findBestOfferForCart, isItemEligibleForOffer } from "../db/offers";
import { Customer, getCustomerByPhone, recordCustomerVisit } from "../db/customers";
import { deductInventoryForOrder } from "../db/inventory";
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
  Sparkles,
  ChevronRight,
  Tag,
  Gift,
  X,
  Award,
  Truck,
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
    discountType,
    discountValue,
    selectedOffer,
    setDiscount,
    setOffer,
    clearDiscount,
    getDiscountAmount,
    deliveryCharge,
    setDeliveryCharge,
    extraChargeName,
    setExtraChargeName,
    clearCart,
  } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">(
    "cash",
  );
  const [loading, setLoading] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<any>(null);

  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [discountMode, setDiscountMode] = useState<"percentage" | "flat">("percentage");
  const [discountInput, setDiscountInput] = useState("");
  const [deliveryInput, setDeliveryInput] = useState(deliveryCharge > 0 ? deliveryCharge.toString() : "");
  const [chargeNameInput, setChargeNameInput] = useState(extraChargeName || "");
  const [customerRecord, setCustomerRecord] = useState<Customer | null>(null);

  const [storeSettings, setStoreSettings] = useState<{
    cafeName: string;
    storeAddress: string;
    storePhone: string;
    storeCity: string;
    upiId: string;
  }>({
    cafeName: "CocoBae",
    storeAddress:
      "GROUND FLOOR. SHOP NUMBER - 12, URBAN 01, NEAR DARSHANAM OXY, NEAR PANCHMUKHI HANUMANJI, VASNA BHAYLI ROAD , Bhayli , Vadodara",
    storePhone: "7043338863",
    storeCity: "Vadodara",
    upiId: "7043338863m@pnb",
  });

  useEffect(() => {
    getActiveOffers().then((offers) => {
      setActiveOffers(offers);
      // Automatically apply the best active offer if cashier hasn't typed manual discount
      if (discountType === "none" || !selectedOffer) {
        const { bestOffer } = findBestOfferForCart(items, offers);
        if (bestOffer) {
          setOffer(bestOffer);
        }
      }
    });
  }, [items]);

  useEffect(() => {
    if (customerPhone.trim().length >= 10) {
      getCustomerByPhone(customerPhone).then((c) => {
        setCustomerRecord(c);
        if (c?.name && !customerName.trim()) {
          setCustomerName(c.name);
        }
      });
    } else {
      setCustomerRecord(null);
    }
  }, [customerPhone]);

  useEffect(() => {
    if (!successOrder) return;
    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onOrderPlaced(successOrder);
          return 0;
        }
        return prev - 1;
      });
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
        cafeName: s.cafe_name || "CocoBae",
        storeAddress:
          s.store_address ||
          "GROUND FLOOR. SHOP NUMBER - 12, URBAN 01, NEAR DARSHANAM OXY, NEAR PANCHMUKHI HANUMANJI, VASNA BHAYLI ROAD , Bhayli , Vadodara",
        storePhone: s.store_phone || "7043338863",
        storeCity: s.store_city || "Vadodara",
        upiId: s.upi_id || "7043338863m@pnb",
      });
      if (s.delivery_enabled === "1" && s.delivery_charge && deliveryCharge === 0) {
        const defaultCharge = parseFloat(s.delivery_charge) || 0;
        setDeliveryCharge(defaultCharge);
        setDeliveryInput(defaultCharge > 0 ? defaultCharge.toString() : "");
      }
    });
  }, []);

  const totalItems = getTotalItemsCount();
  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const gstAmount = getGstAmount();
  const grandTotal = getGrandTotal();

  const handleDiscountInputChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, "");
    setDiscountInput(clean);
    const num = parseFloat(clean) || 0;
    if (num > 0) {
      setDiscount(discountMode, num);
    } else {
      clearDiscount();
    }
  };

  const handleDeliveryInputChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    setDeliveryInput(clean);
    const num = parseInt(clean, 10) || 0;
    setDeliveryCharge(num);
  };

  const handleToggleDiscountMode = (mode: "percentage" | "flat") => {
    setDiscountMode(mode);
    const num = parseFloat(discountInput) || 0;
    if (num > 0) {
      setDiscount(mode, num);
    }
  };

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
        customer_name: customerName.trim() || customerRecord?.name || "Guest",
        customer_phone: customerPhone.trim() || undefined,
        note: orderNote.trim(),
        status: "completed",
        discount_type: selectedOffer ? ("offer" as const) : discountType,
        discount_value: selectedOffer ? selectedOffer.discount_value : discountValue,
        discount_amount: discountAmount,
        delivery_charge: deliveryCharge || 0,
        extra_charge_name: chargeNameInput.trim() || extraChargeName.trim() || "Extra Charge",
      };

      const itemsPayload = items.map((it) => ({
        product_id: it.product.id,
        product_name: it.product.name,
        quantity: it.quantity,
        unit_price: it.product.price,
        subtotal: it.subtotal,
      }));

      const created = await createOrder(orderPayload, itemsPayload);

      // Deduct raw material ingredients from kitchen inventory
      deductInventoryForOrder(itemsPayload).catch(() => {});

      // Record CRM customer visit
      if (customerPhone.trim().length >= 10) {
        recordCustomerVisit(customerPhone.trim(), customerName.trim(), grandTotal).catch(() => {});
      }

      // Attach order items to created object
      created.items = itemsPayload;

      Vibration.vibrate([0, 40, 60, 40]);
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

            <Separator />

            {/* Subtotal */}
            {(() => {
              const successSubtotal =
                successOrder.items && successOrder.items.length > 0
                  ? successOrder.items.reduce((acc, it) => acc + it.subtotal, 0)
                  : Math.max(
                      0,
                      successOrder.total_amount +
                        (successOrder.discount_amount || 0) -
                        (successOrder.delivery_charge || 0) -
                        (successOrder.gst_amount || 0),
                    );
              return (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                    Sub Total
                  </Text>
                  <Text style={{ color: THEME.colors.text, fontSize: 13, fontWeight: "700" }}>
                    {formatINR(successSubtotal)}
                  </Text>
                </View>
              );
            })()}

            {/* Discount if applied */}
            {successOrder.discount_amount && successOrder.discount_amount > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "600" }}>
                  Discount {successOrder.discount_type === "percentage" ? `(${successOrder.discount_value}%)` : successOrder.discount_type === "bxgy" || successOrder.discount_type === "offer" ? "(Offer)" : "(Flat)"}
                </Text>
                <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "700" }}>
                  -{formatINR(successOrder.discount_amount)}
                </Text>
              </View>
            ) : null}

            {/* Extra Charges if applied */}
            {successOrder.delivery_charge && successOrder.delivery_charge > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                  {successOrder.extra_charge_name || "Extra Charge"}
                </Text>
                <Text style={{ color: THEME.colors.text, fontSize: 13, fontWeight: "700" }}>
                  +{formatINR(successOrder.delivery_charge)}
                </Text>
              </View>
            ) : null}

            {/* GST if applied */}
            {successOrder.gst_amount && successOrder.gst_amount > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                  GST Tax
                </Text>
                <Text style={{ color: THEME.colors.text, fontSize: 13, fontWeight: "700" }}>
                  +{formatINR(successOrder.gst_amount)}
                </Text>
              </View>
            ) : null}

            <Separator />

            {/* Amount Paid */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: THEME.colors.text, fontSize: 15, fontWeight: "800" }}>
                Amount Paid
              </Text>
              <Text
                style={{
                  color: THEME.colors.primary,
                  fontSize: 22,
                  fontWeight: "900",
                }}
              >
                {formatINR(successOrder.total_amount)}
              </Text>
            </View>
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
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 15,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              Customer Mobile Number (Optional)
            </Text>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              Saved with order for customer history & billing records.
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

            {/* Instant CRM Repeat Customer Loyalty Banner */}
            {customerRecord ? (
              <View
                style={{
                  backgroundColor: "#F59E0B15",
                  borderWidth: 1.5,
                  borderColor: "#F59E0B50",
                  borderRadius: THEME.radius.md,
                  padding: 12,
                  marginTop: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Sparkles size={16} color="#D97706" />
                    <Text style={{ color: "#D97706", fontSize: 13, fontWeight: "900" }}>
                      Welcome back, {customerRecord.name || "Valued Guest"}!
                    </Text>
                  </View>
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    Visit #{customerRecord.visit_count + 1} &bull; Lifetime Spend: {formatINR(customerRecord.total_spent)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    handleToggleDiscountMode("percentage");
                    handleDiscountInputChange("10");
                  }}
                  style={{
                    backgroundColor:
                      discountValue === 10 && discountMode === "percentage"
                        ? "#10B981"
                        : "#D97706",
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    shadowColor: "#D97706",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>
                    {discountValue === 10 && discountMode === "percentage"
                      ? "✓ 10% Applied"
                      : "1-Tap 10% Off"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Discount & Special Offers Card */}
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
                marginBottom: 6,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Tag size={18} color={THEME.colors.primary} />
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  Discount & Offers
                </Text>
              </View>
              {discountAmount > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    clearDiscount();
                    setDiscountInput("");
                  }}
                  style={{
                    paddingVertical: 2,
                    paddingHorizontal: 6,
                    backgroundColor: "#EF444420",
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#EF4444",
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    Clear Discount
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              Choose a promo offer or enter a percentage / flat rupee discount.
            </Text>

            {/* Active Café Promo Offers */}
            {activeOffers.length > 0 ? (
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 11,
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 8,
                  }}
                >
                  Active Offers (Tap to Apply)
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                >
                  {activeOffers.map((off) => {
                    const isSelected = selectedOffer?.id === off.id;
                    return (
                      <TouchableOpacity
                        key={off.id}
                        onPress={() => {
                          if (isSelected) {
                            clearDiscount();
                            setDiscountInput("");
                          } else {
                            setOffer(off);
                            setDiscountInput("");
                          }
                        }}
                        activeOpacity={0.8}
                        style={{
                          backgroundColor: isSelected
                            ? THEME.colors.primary
                            : THEME.colors.surface2,
                          borderColor: isSelected
                            ? THEME.colors.primary
                            : THEME.colors.border,
                          borderWidth: 1.5,
                          borderRadius: THEME.radius.full,
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Gift
                          size={14}
                          color={
                            isSelected
                              ? THEME.colors.textInverse
                              : THEME.colors.primary
                          }
                        />
                        <Text
                          style={{
                            color: isSelected
                              ? THEME.colors.textInverse
                              : THEME.colors.text,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          {off.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Manual Discount Input Bar */}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              {/* % vs ₹ Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: THEME.colors.surface2,
                  borderRadius: THEME.radius.md,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  overflow: "hidden",
                }}
              >
                <TouchableOpacity
                  onPress={() => handleToggleDiscountMode("percentage")}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor:
                      discountMode === "percentage" && !selectedOffer
                        ? THEME.colors.primary
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color:
                        discountMode === "percentage" && !selectedOffer
                          ? THEME.colors.textInverse
                          : THEME.colors.text,
                      fontWeight: "800",
                      fontSize: 13,
                    }}
                  >
                    % Off
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleToggleDiscountMode("flat")}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor:
                      discountMode === "flat" && !selectedOffer
                        ? THEME.colors.primary
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color:
                        discountMode === "flat" && !selectedOffer
                          ? THEME.colors.textInverse
                          : THEME.colors.text,
                      fontWeight: "800",
                      fontSize: 13,
                    }}
                  >
                    ₹ Flat
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Number Input Box */}
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: THEME.colors.surface2,
                  borderRadius: THEME.radius.md,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  paddingHorizontal: 12,
                }}
              >
                <TextInput
                  value={discountInput}
                  onChangeText={handleDiscountInputChange}
                  placeholder={
                    discountMode === "percentage"
                      ? "Enter % (e.g. 10)"
                      : "Enter ₹ (e.g. 50)"
                  }
                  placeholderTextColor={THEME.colors.textDisabled}
                  keyboardType="numeric"
                  style={{
                    flex: 1,
                    color: THEME.colors.text,
                    fontSize: 14,
                    paddingVertical: 10,
                  }}
                />
                {discountInput.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => {
                      setDiscountInput("");
                      clearDiscount();
                    }}
                  >
                    <X size={16} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Applied Discount Confirmation Banner */}
            {discountAmount > 0 ? (
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: "#10B98115",
                  borderWidth: 1,
                  borderColor: "#10B98140",
                  borderRadius: THEME.radius.md,
                  padding: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={{ color: "#10B981", fontSize: 12, fontWeight: "700" }}>
                    {selectedOffer
                      ? selectedOffer.title
                      : `${discountValue}${discountMode === "percentage" ? "%" : "₹"} Discount Applied`}
                  </Text>
                </View>
                <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "800" }}>
                  -Rs. {discountAmount}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Extra / Delivery / Packaging Charges Card */}
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
                marginBottom: 6,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                <Truck size={18} color={THEME.colors.primary} />
                <Text
                  numberOfLines={1}
                  style={{
                    color: THEME.colors.text,
                    fontSize: 15,
                    fontWeight: "700",
                    flexShrink: 1,
                  }}
                >
                  Extra Charges
                </Text>
              </View>
              {deliveryCharge > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    setDeliveryCharge(0);
                    setDeliveryInput("");
                    setChargeNameInput("");
                    setExtraChargeName("");
                  }}
                  style={{
                    paddingVertical: 3,
                    paddingHorizontal: 8,
                    backgroundColor: "#EF444420",
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                >
                  <Text
                    style={{
                      color: "#EF4444",
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              Add packing, delivery, or custom service charges to this order.
            </Text>

            {/* Charge Name Input */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  color: THEME.colors.textMuted,
                  fontSize: 11,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                Charge Name
              </Text>
              <View
                style={{
                  backgroundColor: THEME.colors.surface2,
                  borderRadius: THEME.radius.md,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  paddingHorizontal: 12,
                }}
              >
                <TextInput
                  value={chargeNameInput}
                  onChangeText={(text) => {
                    setChargeNameInput(text);
                    setExtraChargeName(text);
                  }}
                  placeholder="Enter charge name (e.g. Service Charge, Delivery, Packing)"
                  placeholderTextColor={THEME.colors.textDisabled}
                  style={{
                    color: THEME.colors.text,
                    fontSize: 14,
                    fontWeight: "600",
                    paddingVertical: 10,
                  }}
                />
              </View>
            </View>

            {/* Charge Amount Section */}
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 11,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              Charge Amount (₹)
            </Text>

            {/* Quick Delivery Charge Pills */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              {[
                { label: "No Charge", val: 0 },
                { label: "₹20", val: 20 },
                { label: "₹30", val: 30 },
                { label: "₹40", val: 40 },
                { label: "₹50", val: 50 },
              ].map((pill) => {
                const isSelected = deliveryCharge === pill.val;
                return (
                  <TouchableOpacity
                    key={pill.val}
                    onPress={() => {
                      setDeliveryCharge(pill.val);
                      setDeliveryInput(pill.val > 0 ? pill.val.toString() : "");
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: isSelected
                        ? THEME.colors.primary
                        : THEME.colors.surface2,
                      borderColor: isSelected
                        ? THEME.colors.primary
                        : THEME.colors.border,
                      borderWidth: 1,
                      borderRadius: THEME.radius.md,
                      paddingVertical: 8,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? "#FFFFFF" : THEME.colors.text,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {pill.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Amount Input */}
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
              <Text
                style={{
                  color: THEME.colors.textMuted,
                  fontSize: 14,
                  fontWeight: "700",
                  marginRight: 6,
                }}
              >
                ₹
              </Text>
              <TextInput
                value={deliveryInput}
                onChangeText={handleDeliveryInputChange}
                placeholder="Custom amount (e.g. 45)"
                placeholderTextColor={THEME.colors.textDisabled}
                keyboardType="numeric"
                style={{
                  flex: 1,
                  color: THEME.colors.text,
                  fontSize: 14,
                  paddingVertical: 10,
                }}
              />
              {deliveryInput.length > 0 ? (
                <TouchableOpacity
                  onPress={() => {
                    setDeliveryInput("");
                    setDeliveryCharge(0);
                  }}
                >
                  <X size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Real-time Applied Charge Confirmation Banner */}
            {deliveryCharge > 0 ? (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: THEME.colors.primary + "15",
                  borderWidth: 1,
                  borderColor: THEME.colors.primary + "40",
                  borderRadius: THEME.radius.md,
                  padding: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                  <CheckCircle2 size={16} color={THEME.colors.primary} />
                  <Text style={{ color: THEME.colors.primary, fontSize: 13, fontWeight: "700" }}>
                    {chargeNameInput.trim() || extraChargeName || "Extra Charge"} Applied
                  </Text>
                </View>
                <Text style={{ color: THEME.colors.primary, fontSize: 14, fontWeight: "800" }}>
                  +{formatINR(deliveryCharge)}
                </Text>
              </View>
            ) : null}
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

            {items.map((it) => {
              const isB1G1Eligible =
                selectedOffer?.offer_type === "b1g1" &&
                (!selectedOffer.category_id ||
                  it.product.category_id === selectedOffer.category_id) &&
                it.quantity >= 2;
              const freeUnits = isB1G1Eligible ? Math.floor(it.quantity / 2) : 0;
              const b1g1Savings = freeUnits * it.product.price;

              const isCatDiscount =
                selectedOffer?.offer_type === "category_discount" &&
                it.product.category_id === selectedOffer.category_id;
              const catDiscountSavings = isCatDiscount
                ? Math.round((it.subtotal * selectedOffer.discount_value) / 100)
                : 0;

              return (
                <View key={it.product.id} style={{ paddingVertical: 4 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
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

                  {/* Dynamic Offer / B1G1 Product Adaptation Indicator */}
                  {freeUnits > 0 ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 2,
                      }}
                    >
                      <Sparkles size={12} color="#10B981" />
                      <Text
                        style={{
                          color: "#10B981",
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        B1G1 Applied: {freeUnits} free unit{freeUnits > 1 ? "s" : ""} (-{formatINR(b1g1Savings)})
                      </Text>
                    </View>
                  ) : null}

                  {catDiscountSavings > 0 ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 2,
                      }}
                    >
                      <Tag size={12} color="#10B981" />
                      <Text
                        style={{
                          color: "#10B981",
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        {selectedOffer!.discount_value}% Category Offer (-{formatINR(catDiscountSavings)})
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}

            <Separator style={{ marginVertical: 10 }} />

            {/* Subtotal */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>
                Sub Total
              </Text>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                {formatINR(subtotal)}
              </Text>
            </View>

            {/* Discount Line if > 0 */}
            {discountAmount > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "700" }}>
                  Discount {selectedOffer ? `(${selectedOffer.title})` : discountMode === "percentage" ? `(${discountValue}%)` : "(Flat)"}
                </Text>
                <Text
                  style={{
                    color: "#10B981",
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  -{formatINR(discountAmount)}
                </Text>
              </View>
            ) : null}

            {/* Extra Charge Line */}
            {deliveryCharge > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                  {chargeNameInput.trim() || extraChargeName || "Extra Charge"}
                </Text>
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  +{formatINR(deliveryCharge)}
                </Text>
              </View>
            ) : null}

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
