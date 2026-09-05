import React from "react";
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from "react-native";
import { THEME } from "../../theme/tokens";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  containerStyle,
  style,
  ...props
}) => {
  return (
    <View style={[{ width: "100%", marginBottom: 12 }, containerStyle]}>
      {label ? (
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 13,
            fontWeight: "500",
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: THEME.colors.surface,
          borderColor: error ? THEME.colors.danger : THEME.colors.border,
          borderWidth: 1,
          borderRadius: THEME.radius.md,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
        }}
      >
        {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
        <TextInput
          placeholderTextColor={THEME.colors.textDisabled}
          style={[
            {
              flex: 1,
              color: THEME.colors.text,
              fontSize: 15,
              paddingVertical: 10,
            },
            style as TextStyle,
          ]}
          {...props}
        />
      </View>
      {error ? (
        <Text
          style={{ color: THEME.colors.danger, fontSize: 11, marginTop: 4 }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};
