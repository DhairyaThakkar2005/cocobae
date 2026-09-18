import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { THEME } from "../theme/tokens";
import { useCartStore } from "../store/cartStore";
import { formatINR } from "../lib/utils";
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft } from "../lib/icons";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export interface CartPanelProps {
  onProceedCheckout: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({ onProceedCheckout }) => {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalItemsCount,
    getSubtotal,
    getGstAmount,
    getGrandTotal,
    gstEnabled,
    gstPercent,
    getDiscountAmount,
    discountType,
    discountValue,
    selectedOffer,
    deliveryCharge,
    extraChargeName,
  } = useCartStore();

  const totalItems = getTotalItemsCount();
  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const gstAmount = getGstAmount();
  const grandTotal = getGrandTotal();

  return (
    <View
      style={{
        width: 340,
        backgroundColor: THEME.colors.surface,
        borderLeftWidth: 1,
        borderLeftColor: THEME.colors.border,
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Panel Header */}
      <View
        style={{
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ShoppingBag size={20} color={THEME.colors.primary} />
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 17,
              fontWeight: "700",
            }}
          >
            Current Order
          </Text>
        </View>

        {items.length > 0 ? (
          <TouchableOpacity onPress={clearCart}>
            <Text
              style={{
                color: THEME.colors.danger,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              Clear
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Cart Items List */}
      {items.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <ShoppingBag size={48} color={THEME.colors.textDisabled} />
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 14,
              fontWeight: "600",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            No items in order
          </Text>
          <Text
            style={{
              color: THEME.colors.textDisabled,
              fontSize: 12,
              marginTop: 4,
              textAlign: "center",
            }}
          >
            Select desserts from the menu to build an order
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14 }}
        >
          {items.map((item) => (
            <View
              key={item.product.id}
              style={{
                backgroundColor: THEME.colors.surface2,
                borderRadius: THEME.radius.md,
                padding: 12,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: THEME.colors.border,
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
                    numberOfLines={1}
                    style={{
                      color: THEME.colors.text,
                      fontSize: 14,
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
                    <Text
                      numberOfLines={1}
                      style={{
                        color: THEME.colors.secondary,
                        fontSize: 11,
                        marginTop: 4,
                        fontStyle: "italic",
                      }}
                    >
                      Note: {item.note}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={() => removeItem(item.product.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={16} color={THEME.colors.danger} />
                </TouchableOpacity>
              </View>

              {/* Stepper + Subtotal */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: THEME.colors.surface,
                    borderRadius: THEME.radius.sm,
                    borderColor: THEME.colors.border,
                    borderWidth: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    gap: 12,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.product.id, -1)}
                  >
                    <Minus size={14} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                  <Text
                    style={{
                      color: THEME.colors.text,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {item.quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.product.id, 1)}
                  >
                    <Plus size={14} color={THEME.colors.primary} />
                  </TouchableOpacity>
                </View>

                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 14,
                    fontWeight: "800",
                  }}
                >
                  {formatINR(item.subtotal)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Bill Calculation Bottom Footer */}
      {items.length > 0 ? (
        <View
          style={{
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: THEME.colors.border,
            backgroundColor: THEME.colors.surface2,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>
              Items ({totalItems})
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

          {discountAmount > 0 ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "600" }}>
                Discount {selectedOffer ? `(${selectedOffer.title})` : discountType === "percentage" ? `(${discountValue}%)` : "(Flat)"}
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

          {deliveryCharge > 0 ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                {extraChargeName || "Extra Charge"}
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

          {gstEnabled ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>
                GST ({gstPercent}%)
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

          <Separator style={{ marginVertical: 8 }} />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 16,
                fontWeight: "800",
              }}
            >
              Total Due
            </Text>
            <Text
              style={{
                color: THEME.colors.primary,
                fontSize: 18,
                fontWeight: "800",
              }}
            >
              {formatINR(grandTotal)}
            </Text>
          </View>

          <Button onPress={onProceedCheckout} size="md">
            Proceed to Checkout
          </Button>
        </View>
      ) : null}
    </View>
  );
};
