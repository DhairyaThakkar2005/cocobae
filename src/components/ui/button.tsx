import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { THEME } from "../../theme/tokens";

export interface ButtonProps {
  onPress?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  let bgStyle: ViewStyle = {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };

  let textColor: string = THEME.colors.textInverse;

  if (variant === "secondary") {
    bgStyle.backgroundColor = THEME.colors.surface2;
    bgStyle.borderWidth = 1;
    bgStyle.borderColor = THEME.colors.border;
    textColor = THEME.colors.text;
  } else if (variant === "outline") {
    bgStyle.backgroundColor = "transparent";
    bgStyle.borderWidth = 1.5;
    bgStyle.borderColor = THEME.colors.primary;
    textColor = THEME.colors.primary;
  } else if (variant === "ghost") {
    bgStyle.backgroundColor = "transparent";
    textColor = THEME.colors.textMuted;
  } else if (variant === "danger") {
    bgStyle.backgroundColor = THEME.colors.danger;
    textColor = "#FFFFFF";
  }

  let paddingVertical = 12;
  let paddingHorizontal = 16;
  let fontSize = 15;

  if (size === "sm") {
    paddingVertical = 8;
    paddingHorizontal = 12;
    fontSize = 13;
  } else if (size === "lg") {
    paddingVertical = 16;
    paddingHorizontal = 24;
    fontSize = 17;
  }

  bgStyle.paddingVertical = paddingVertical;
  bgStyle.paddingHorizontal = paddingHorizontal;

  if (disabled) {
    bgStyle.opacity = 0.5;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[bgStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          {React.isValidElement(children) ? (
            children
          ) : (
            <Text
              style={[
                {
                  color: textColor,
                  fontSize,
                  fontWeight: "600",
                  textAlign: "center",
                },
                textStyle,
              ]}
            >
              {children}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};
