import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { THEME } from "../theme/tokens";
import { formatINR } from "../lib/utils";
import { ShoppingCart, ChevronRight } from "../lib/icons";

export interface CartBarProps {
  totalItems: number;
  totalAmount: number;
  onPress: () => void;
}

export const CartBar: React.FC<CartBarProps> = ({
  totalItems,
  totalAmount,
  onPress,
}) => {
  if (totalItems <= 0) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 50,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={{
          backgroundColor: THEME.colors.primary,
          borderRadius: THEME.radius.lg,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          shadowColor: THEME.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              backgroundColor: THEME.colors.textInverse,
              borderRadius: THEME.radius.full,
              padding: 6,
            }}
          >
            <ShoppingCart size={18} color={THEME.colors.primary} />
          </View>
          <View>
            <Text
              style={{
                color: THEME.colors.textInverse,
                fontSize: 14,
                fontWeight: "800",
              }}
            >
              {totalItems} {totalItems === 1 ? "item" : "items"} added
            </Text>
            <Text
              style={{
                color: "rgba(15, 10, 6, 0.75)",
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              Total: {formatINR(totalAmount)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text
            style={{
              color: THEME.colors.textInverse,
              fontSize: 15,
              fontWeight: "800",
            }}
          >
            Continue
          </Text>
          <ChevronRight size={20} color={THEME.colors.textInverse} />
        </View>
      </TouchableOpacity>
    </View>
  );
};
