import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { THEME } from "../../theme/tokens";

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "veg"
    | "nonveg"
    | "outline";
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  style,
}) => {
  let bg: string = THEME.colors.primaryGlow;
  let text: string = THEME.colors.primary;
  let border: string = "transparent";

  if (variant === "secondary") {
    bg = THEME.colors.surface2;
    text = THEME.colors.textMuted;
  } else if (variant === "success" || variant === "veg") {
    bg = "rgba(76, 175, 125, 0.15)";
    text = THEME.colors.success;
    border = "rgba(76, 175, 125, 0.3)";
  } else if (variant === "danger" || variant === "nonveg") {
    bg = "rgba(232, 93, 93, 0.15)";
    text = THEME.colors.danger;
    border = "rgba(232, 93, 93, 0.3)";
  } else if (variant === "outline") {
    bg = "transparent";
    text = THEME.colors.textMuted;
    border = THEME.colors.border;
  }

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: THEME.radius.full,
          paddingHorizontal: 8,
          paddingVertical: 3,
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        },
        style,
      ]}
    >
      {React.isValidElement(children) ? (
        children
      ) : (
        <Text style={{ color: text, fontSize: 11, fontWeight: "600" }}>
          {children}
        </Text>
      )}
    </View>
  );
};
