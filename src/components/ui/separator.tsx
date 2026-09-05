import React from "react";
import { View, ViewStyle } from "react-native";
import { THEME } from "../../theme/tokens";

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  style?: ViewStyle;
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = "horizontal",
  style,
}) => {
  return (
    <View
      style={[
        orientation === "horizontal"
          ? {
              height: 1,
              width: "100%",
              backgroundColor: THEME.colors.divider,
              marginVertical: 12,
            }
          : {
              width: 1,
              height: "100%",
              backgroundColor: THEME.colors.divider,
              marginHorizontal: 12,
            },
        style,
      ]}
    />
  );
};
