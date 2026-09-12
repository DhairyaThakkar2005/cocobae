import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { THEME } from "../../theme/tokens";

export const ReportSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View style={{ gap: 14, paddingVertical: 10 }}>
      {/* Banner Skeleton */}
      <Animated.View
        style={{
          opacity,
          height: 90,
          borderRadius: THEME.radius.lg,
          backgroundColor: THEME.colors.surface2,
          borderWidth: 1,
          borderColor: THEME.colors.border,
        }}
      />

      {/* Rows Skeletons */}
      {Array.from({ length: rows }).map((_, idx) => (
        <Animated.View
          key={idx}
          style={{
            opacity,
            height: 72,
            borderRadius: THEME.radius.md,
            backgroundColor: THEME.colors.surface,
            borderWidth: 1,
            borderColor: THEME.colors.border,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 8, flex: 1 }}>
            <View
              style={{
                height: 14,
                width: "45%",
                borderRadius: 4,
                backgroundColor: THEME.colors.surface2,
              }}
            />
            <View
              style={{
                height: 10,
                width: "25%",
                borderRadius: 4,
                backgroundColor: THEME.colors.surface2,
              }}
            />
          </View>
          <View
            style={{
              height: 18,
              width: "20%",
              borderRadius: 4,
              backgroundColor: THEME.colors.surface2,
            }}
          />
        </Animated.View>
      ))}
    </View>
  );
};
