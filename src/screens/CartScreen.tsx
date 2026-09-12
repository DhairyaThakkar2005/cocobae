import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { THEME } from "../theme/tokens";
import { useCartStore } from "../store/cartStore";
import { formatINR } from "../lib/utils";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
} from "../lib/icons";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { useBreakpoint } from "../theme/breakpoints";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";

export interface CartScreenProps {
  onBack: () => void;
  onProceedCheckout: () => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  onBack,
  onProceedCheckout,
}) => {
  const { isTablet, width } = useBreakpoint();
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    orderNote,
    setOrderNote,
    getTotalItemsCount,
    getSubtotal,
    getGstAmount,
    getGrandTotal,
    gstEnabled,
    gstPercent,
  } = useCartStore();

  const totalItems = getTotalItemsCount();
  const subtotal = getSubtotal();
  const gstAmount = getGstAmount();
  const grandTotal = getGrandTotal();

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
            Review Order
          </Text>
        </TouchableOpacity>

        {items.length > 0 ? (
          <TouchableOpacity onPress={clearCart}>
            <Text
              style={{
                color: THEME.colors.danger,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              Clear Cart
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Content */}
      {items.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <ShoppingBag size={56} color={THEME.colors.textDisabled} />
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 18,
              fontWeight: "700",
              marginTop: 14,
            }}
          >
            Your order is empty
          </Text>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 13,
              marginTop: 4,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            Add items from the menu to proceed with checkout.
          </Text>
          <Button onPress={onBack} variant="primary">
            Back to Menu
          </Button>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            flexDirection: isTablet ? "row" : "column",
            justifyContent: "center",
            padding: isTablet ? 20 : 0,
          }}
        >
          {/* Items List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1, maxWidth: isTablet ? 600 : "100%" }}
            contentContainerStyle={{ padding: 16 }}
          >
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Selected Desserts ({totalItems})
            </Text>

            {items.map((item, idx) => (
              <Animated.View
                key={item.product.id}
                entering={FadeInDown.delay(idx * 40).duration(280).springify()}
                layout={Layout.springify()}
                style={{
                  backgroundColor: THEME.colors.surface,
                  borderRadius: THEME.radius.lg,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={{
                        color: THEME.colors.text,
                        fontSize: 15,
                        fontWeight: "700",
                      }}
                    >
                      {item.product.name}
                    </Text>
                    <Text
                      style={{
                        color: THEME.colors.primary,
                        fontSize: 13,
                        fontWeight: "700",
                        marginTop: 2,
                      }}
                    >
                      {formatINR(item.product.price)} each
                    </Text>
                    {item.note ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 4,
                        }}
                      >
                        <Sparkles size={12} color={THEME.colors.secondary} />
                        <Text
                          style={{
                            color: THEME.colors.secondary,
                            fontSize: 11,
                            fontStyle: "italic",
                          }}
                        >
                          {item.note}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    onPress={() => removeItem(item.product.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={18} color={THEME.colors.danger} />
                  </TouchableOpacity>
                </View>

                {/* Counter + Subtotal Row */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: THEME.colors.divider,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: THEME.colors.surface2,
                      borderRadius: THEME.radius.md,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      gap: 12,
                      borderWidth: 1,
                      borderColor: THEME.colors.border,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.product.id, -1)}
                    >
                      <Minus size={15} color={THEME.colors.primary} />
                    </TouchableOpacity>
                    <Text
                      style={{
                        color: THEME.colors.text,
                        fontSize: 14,
                        fontWeight: "700",
                        minWidth: 20,
                        textAlign: "center",
                      }}
                    >
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.product.id, 1)}
                    >
                      <Plus size={15} color={THEME.colors.primary} />
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={{
                      color: THEME.colors.text,
                      fontSize: 16,
                      fontWeight: "800",
                    }}
                  >
                    {formatINR(item.subtotal)}
                  </Text>
                </View>
              </Animated.View>
            ))}

            {/* General Order Note */}
            <View
              style={{
                backgroundColor: THEME.colors.surface,
                borderRadius: THEME.radius.lg,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                padding: 14,
                marginTop: 6,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  color: THEME.colors.textMuted,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 6,
                }}
              >
                Table No. / Order Notes (Optional)
              </Text>
              <TextInput
                value={orderNote}
                onChangeText={setOrderNote}
                placeholder="e.g. Table 4, Serve dessert after main course"
                placeholderTextColor={THEME.colors.textDisabled}
                style={{
                  backgroundColor: THEME.colors.surface2,
                  borderRadius: THEME.radius.md,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  color: THEME.colors.text,
                  fontSize: 13,
                  padding: 10,
                }}
              />
            </View>
          </ScrollView>

          {/* Bill Calculation Box */}
          <View
            style={{
              width: isTablet ? 380 : "100%",
              backgroundColor: THEME.colors.surface,
              borderTopWidth: isTablet ? 0 : 1,
              borderLeftWidth: isTablet ? 1 : 0,
              borderColor: THEME.colors.border,
              padding: 18,
            }}
          >
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 16,
                fontWeight: "800",
                marginBottom: 12,
              }}
            >
              Payment Breakdown
            </Text>

            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>
                  Item Total ({totalItems})
                </Text>
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {formatINR(subtotal)}
                </Text>
              </View>

              {gstEnabled ? (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>
                    GST ({gstPercent}%)
                  </Text>
                  <Text
                    style={{
                      color: THEME.colors.text,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {formatINR(gstAmount)}
                  </Text>
                </View>
              ) : null}

              <Separator />

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
                  To Pay
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

            <Button
              onPress={onProceedCheckout}
              size="lg"
              style={{ marginTop: 20 }}
            >
              Continue to Checkout
            </Button>
          </View>
        </View>
      )}
    </View>
  );
};
