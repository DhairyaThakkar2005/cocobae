import React from "react";
import { View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { THEME } from "../theme/tokens";
import { Minus, Plus } from "../lib/icons";

export interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  max = 99,
  size = "md",
  style,
}) => {
  let height = 44;
  let paddingH = 14;
  let fontSize = 16;
  let iconSize = 18;

  if (size === "sm") {
    height = 36;
    paddingH = 10;
    fontSize = 14;
    iconSize = 14;
  } else if (size === "lg") {
    height = 52;
    paddingH = 18;
    fontSize = 18;
    iconSize = 20;
  }

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(76, 175, 125, 0.08)",
          borderColor: THEME.colors.success,
          borderWidth: 1.5,
          borderRadius: THEME.radius.md,
          height,
          paddingHorizontal: paddingH,
          minWidth: size === "sm" ? 90 : 110,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onDecrease}
        disabled={quantity <= min}
        style={{
          padding: 4,
          opacity: quantity <= min ? 0.4 : 1,
        }}
        activeOpacity={0.7}
      >
        <Minus size={iconSize} color={THEME.colors.success} />
      </TouchableOpacity>

      <Text
        style={{
          color: THEME.colors.text,
          fontSize,
          fontWeight: "700",
          marginHorizontal: 12,
        }}
      >
        {quantity}
      </Text>

      <TouchableOpacity
        onPress={onIncrease}
        disabled={quantity >= max}
        style={{
          padding: 4,
          opacity: quantity >= max ? 0.4 : 1,
        }}
        activeOpacity={0.7}
      >
        <Plus size={iconSize} color={THEME.colors.success} />
      </TouchableOpacity>
    </View>
  );
};
