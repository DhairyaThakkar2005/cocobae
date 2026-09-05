import React from "react";
import { View, ViewStyle } from "react-native";
import { THEME } from "../../theme/tokens";

export interface CardProps {
  children: React.ReactNode;
  variant?: "surface" | "glass" | "elevated" | "outline";
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "surface",
  style,
}) => {
  let cardStyle: ViewStyle = {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  };

  if (variant === "glass") {
    cardStyle.backgroundColor = THEME.colors.glass;
    cardStyle.borderColor = THEME.colors.glassBorder;
  } else if (variant === "elevated") {
    cardStyle.backgroundColor = THEME.colors.surface2;
    cardStyle.borderColor = THEME.colors.border;
    cardStyle.shadowColor = "#000";
    cardStyle.shadowOffset = { width: 0, height: 4 };
    cardStyle.shadowOpacity = 0.4;
    cardStyle.shadowRadius = 8;
    cardStyle.elevation = 4;
  } else if (variant === "outline") {
    cardStyle.backgroundColor = "transparent";
    cardStyle.borderColor = THEME.colors.borderStrong;
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};
