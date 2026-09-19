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
import { decrementProductStock } from "../db/products";
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
  Utensils,
  ShoppingBag,
  Plus,
  Trash2,
  Layers,
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
    extraCharges,
    addExtraCharge,
    updateExtraCharge,
    removeExtraCharge,
    clearExtraCharges,
    getExtraChargesTotal,
    orderType,
    setOrderType,
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
      const isEnabled =
        s.delivery_enabled === undefined ||
        s.delivery_enabled === "1" ||
        s.delivery_enabled === "true";
      if (orderType === "takeaway") {
        const defaultCharge = parseFloat(s.delivery_charge || "30") || 30;
        if (isEnabled || defaultCharge > 0) {
          setDeliveryCharge(defaultCharge);
        }
      } else {
        setDeliveryCharge(0);
      }
    }).catch(() => {});
  }, [orderType]);

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

  const handleToggleDiscountMode = (mode: "percentage" | "flat") => {
    setDiscountMode(mode);
    const num = parseFloat(discountInput) || 0;
    if (num > 0) {
      setDiscount(mode, num);
    }
  };

  const handleToggleOrderType = async (type: "dine_in" | "takeaway") => {
    setOrderType(type);
    if (type === "takeaway") {
      try {
        const s = await getAllSettings();
        const isEnabled =
          s.delivery_enabled === undefined ||
          s.delivery_enabled === "1" ||
          s.delivery_enabled === "true";
        const defaultCharge = parseFloat(s.delivery_charge || "30") || 30;
        if (isEnabled || defaultCharge > 0) {
          setDeliveryCharge(defaultCharge);
        }
      } catch (err) {
        console.warn("Could not load delivery settings:", err);
      }
    } else {
      setDeliveryCharge(0);
    }
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert("Empty Order", "Please add items before placing order.");
      return;
    }

    setLoading(true);
    try {
      const finalDeliveryCharge = orderType === "takeaway" ? (deliveryCharge || 0) : 0;
      const validExtraCharges = extraCharges
        .filter((c) => c.name.trim() || Number(c.amount) > 0)
        .map((c) => ({
          name: c.name.trim() || "Extra Charge",
          amount: Math.max(0, Math.round(Number(c.amount) || 0)),
        }))
        .filter((c) => c.amount > 0);

      const finalExtraChargeName =
        validExtraCharges.length === 1
          ? validExtraCharges[0].name
          : validExtraCharges.length > 1
            ? validExtraCharges.map((c) => c.name).join(", ")
            : "Extra Charge";

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
        order_type: orderType,
        discount_type: selectedOffer ? ("offer" as const) : discountType,
        discount_value: selectedOffer ? selectedOffer.discount_value : discountValue,
        discount_amount: discountAmount,
        delivery_charge: finalDeliveryCharge,
        extra_charge_name: finalExtraChargeName,
        extra_charges_json:
          validExtraCharges.length > 0 ? JSON.stringify(validExtraCharges) : undefined,
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

      // Deduct finished product stock
      for (const it of itemsPayload) {
        decrementProductStock(it.product_id, it.quantity).catch(() => {});
      }

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
                Order Type
              </Text>
              <View
                style={{
                  backgroundColor: THEME.colors.primary + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
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
                  {successOrder.order_type === "takeaway" ? "Takeaway 🛍️" : "Dine In 🍽️"}
                </Text>
              </View>
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
              let extraList: { name: string; amount: number }[] = [];
              if (successOrder.extra_charges_json) {
                try {
                  extraList = JSON.parse(successOrder.extra_charges_json);
                } catch {}
              }
              const extraTotal = extraList.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
              const successSubtotal =
                successOrder.items && successOrder.items.length > 0
                  ? successOrder.items.reduce((acc, it) => acc + it.subtotal, 0)
                  : Math.max(
                      0,
                      successOrder.total_amount +
                        (successOrder.discount_amount || 0) -
                        (successOrder.delivery_charge || 0) -
                        extraTotal -
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

            {/* Delivery Charge (Takeaway) */}
            {Number(successOrder.delivery_charge || 0) > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                  Delivery Charge
                </Text>
                <Text style={{ color: THEME.colors.text, fontSize: 13, fontWeight: "700" }}>
                  +{formatINR(Number(successOrder.delivery_charge))}
                </Text>
              </View>
            ) : null}

            {/* Additional Custom Extra Charges */}
            {(() => {
              let list: { name: string; amount: number }[] = [];
              if (successOrder.extra_charges_json) {
                try {
                  list = JSON.parse(successOrder.extra_charges_json);
                } catch {}
              }
              return list.filter((c) => Number(c.amount) > 0).map((c, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                    {c.name || "Extra Charge"}
                  </Text>
                  <Text style={{ color: THEME.colors.text, fontSize: 13, fontWeight: "700" }}>
                    +{formatINR(Number(c.amount))}
                  </Text>
                </View>
              ));
            })()}

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
          {/* Order Type: Dine In vs Takeaway Selector */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: THEME.colors.surface,
              borderRadius: THEME.radius.lg,
              borderWidth: 1,
              borderColor: THEME.colors.border,
              padding: 4,
              gap: 6,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleOrderType("dine_in")}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                borderRadius: THEME.radius.md,
                backgroundColor:
                  orderType === "dine_in"
                    ? THEME.colors.primary
                    : "transparent",
                gap: 8,
              }}
            >
              <Utensils
                size={16}
                color={
                  orderType === "dine_in"
                    ? THEME.colors.textInverse
                    : THEME.colors.textMuted
                }
              />
              <Text
                style={{
                  color:
                    orderType === "dine_in"
                      ? THEME.colors.textInverse
                      : THEME.colors.text,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                Dine In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleOrderType("takeaway")}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                borderRadius: THEME.radius.md,
                backgroundColor:
                  orderType === "takeaway"
                    ? THEME.colors.primary
                    : "transparent",
                gap: 8,
              }}
            >
              <ShoppingBag
                size={16}
                color={
                  orderType === "takeaway"
                    ? THEME.colors.textInverse
                    : THEME.colors.textMuted
                }
              />
              <Text
                style={{
                  color:
                    orderType === "takeaway"
                      ? THEME.colors.textInverse
                      : THEME.colors.text,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                Takeaway
              </Text>
            </TouchableOpacity>
          </View>

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

          {/* Custom Extra Charges Card (Infinite multi-charge support) */}
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
                <Layers size={18} color={THEME.colors.primary} />
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
                {getExtraChargesTotal() > 0 ? (
                  <View
                    style={{
                      backgroundColor: THEME.colors.primary + "20",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ color: THEME.colors.primary, fontSize: 11, fontWeight: "700" }}>
                      +{formatINR(getExtraChargesTotal())}
                    </Text>
                  </View>
                ) : null}
              </View>

              {extraCharges.length > 0 ? (
                <TouchableOpacity
                  onPress={clearExtraCharges}
                  style={{
                    paddingVertical: 3,
                    paddingHorizontal: 8,
                    backgroundColor: "#EF444418",
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
                    Clear All
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
              Add any additional charges (service fee, special packing, container box, late night, etc.).
            </Text>

            {/* Quick Presets */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {[
                { name: "Service Charge", amount: 20 },
                { name: "Container / Box", amount: 15 },
                { name: "Gift Packing", amount: 30 },
                { name: "Late Night Fee", amount: 25 },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  onPress={() => addExtraCharge(preset.name, preset.amount)}
                  style={{
                    backgroundColor: THEME.colors.surface2,
                    borderWidth: 1,
                    borderColor: THEME.colors.border,
                    borderRadius: THEME.radius.full,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Plus size={11} color={THEME.colors.primary} />
                  <Text style={{ color: THEME.colors.text, fontSize: 11, fontWeight: "600" }}>
                    {preset.name} (+₹{preset.amount})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* List of Extra Charges */}
            {extraCharges.length === 0 ? (
              <View
                style={{
                  backgroundColor: THEME.colors.surface2,
                  borderRadius: THEME.radius.md,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: THEME.colors.borderStrong,
                  padding: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
                  No extra charges added yet.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8, marginBottom: 10 }}>
                {extraCharges.map((charge) => (
                  <View
                    key={charge.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: THEME.colors.surface2,
                      borderRadius: THEME.radius.md,
                      borderWidth: 1,
                      borderColor: THEME.colors.border,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      gap: 8,
                    }}
                  >
                    <TextInput
                      value={charge.name}
                      onChangeText={(val) => updateExtraCharge(charge.id, val, charge.amount)}
                      placeholder="Charge name (e.g. Service Charge)"
                      placeholderTextColor={THEME.colors.textDisabled}
                      style={{
                        flex: 1,
                        color: THEME.colors.text,
                        fontSize: 13,
                        fontWeight: "600",
                        paddingVertical: 4,
                      }}
                    />

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: THEME.colors.surface,
                        borderRadius: THEME.radius.sm,
                        borderWidth: 1,
                        borderColor: THEME.colors.border,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        minWidth: 70,
                      }}
                    >
                      <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "700" }}>
                        ₹
                      </Text>
                      <TextInput
                        value={charge.amount > 0 ? String(charge.amount) : ""}
                        onChangeText={(val) => {
                          const num = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
                          updateExtraCharge(charge.id, charge.name, num);
                        }}
                        placeholder="0"
                        placeholderTextColor={THEME.colors.textDisabled}
                        keyboardType="numeric"
                        style={{
                          color: THEME.colors.text,
                          fontSize: 13,
                          fontWeight: "700",
                          paddingVertical: 2,
                          paddingHorizontal: 4,
                          minWidth: 35,
                          textAlign: "right",
                        }}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => removeExtraCharge(charge.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        padding: 4,
                        borderRadius: 4,
                        backgroundColor: "#EF444415",
                      }}
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Another Charge Button */}
            <TouchableOpacity
              onPress={() => addExtraCharge("", 0)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: THEME.radius.md,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: THEME.colors.primary,
                backgroundColor: THEME.colors.primaryGlow,
              }}
            >
              <Plus size={15} color={THEME.colors.primary} />
              <Text style={{ color: THEME.colors.primary, fontSize: 13, fontWeight: "700" }}>
                Add Custom Charge
              </Text>
            </TouchableOpacity>

            {/* Total Banner */}
            {getExtraChargesTotal() > 0 ? (
              <View
                style={{
                  marginTop: 10,
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
                    Total Extra Charges Applied
                  </Text>
                </View>
                <Text style={{ color: THEME.colors.primary, fontSize: 14, fontWeight: "800" }}>
                  +{formatINR(getExtraChargesTotal())}
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

            {/* Delivery Charge (Takeaway only) */}
            {orderType === "takeaway" && deliveryCharge > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                  Delivery Charge
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

            {/* Additional Custom Extra Charges */}
            {extraCharges.filter((c) => Number(c.amount) > 0).map((c) => (
              <View
                key={c.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                  {c.name || "Extra Charge"}
                </Text>
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  +{formatINR(Number(c.amount))}
                </Text>
              </View>
            ))}

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
