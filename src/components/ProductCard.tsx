import React from "react";
import { View, Text, TouchableOpacity, Image, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { THEME } from "../theme/tokens";
import { Product } from "../db/products";
import { formatINR } from "../lib/utils";
import { Plus, Minus, Cake } from "../lib/icons";

export interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onPress: () => void;
  onAddQuick: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
  style?: ViewStyle;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onPress,
  onAddQuick,
  onIncrease,
  onDecrease,
  style,
}) => {
  const gradFrom = product.grad_from || THEME.gradients.cake[0];
  const gradTo = product.grad_to || THEME.gradients.cake[1];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        {
          backgroundColor: THEME.colors.surface,
          borderRadius: THEME.radius.lg,
          borderWidth: 1,
          borderColor:
            quantityInCart > 0
              ? THEME.colors.borderStrong
              : THEME.colors.border,
          overflow: "hidden",
          marginBottom: 12,
        },
        style,
      ]}
    >
      {/* Product Image or Category Gradient Banner */}
      <View style={{ height: 110, width: "100%", position: "relative" }}>
        {product.image_path ? (
          <Image
            source={{ uri: product.image_path }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[gradFrom, gradTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: "100%",
              height: "100%",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.25)",
                padding: 10,
                borderRadius: THEME.radius.full,
              }}
            >
              <Cake color="#FFFFFF" size={28} />
            </View>
          </LinearGradient>
        )}

        {/* Veg / Non-veg indicator dot */}
        <View
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            backgroundColor: "rgba(15, 10, 6, 0.85)",
            borderRadius: 4,
            padding: 3,
            borderWidth: 1,
            borderColor: product.is_veg
              ? THEME.colors.success
              : THEME.colors.nonveg,
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: product.is_veg
                ? THEME.colors.success
                : THEME.colors.nonveg,
            }}
          />
        </View>

        {/* Availability Badge */}
        {product.is_available === 0 ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 12 }}>
              SOLD OUT
            </Text>
          </View>
        ) : null}
      </View>

      {/* Details */}
      <View style={{ padding: 10, flex: 1, justifyContent: "space-between" }}>
        <View>
          <Text
            numberOfLines={1}
            style={{
              color: THEME.colors.text,
              fontSize: 14,
              fontWeight: "700",
              marginBottom: 2,
            }}
          >
            {product.name}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              color: THEME.colors.textMuted,
              fontSize: 11,
              lineHeight: 15,
              marginBottom: 8,
            }}
          >
            {product.description || "Delightful dessert specialty."}
          </Text>
        </View>

        {/* Price & Action Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <Text
            style={{
              color: THEME.colors.primary,
              fontSize: 15,
              fontWeight: "800",
            }}
          >
            {formatINR(product.price)}
          </Text>

          {quantityInCart > 0 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(76, 175, 125, 0.15)",
                borderColor: THEME.colors.success,
                borderWidth: 1,
                borderRadius: THEME.radius.sm,
                paddingHorizontal: 6,
                paddingVertical: 3,
                gap: 6,
              }}
            >
              <TouchableOpacity
                onPress={onDecrease}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Minus size={14} color={THEME.colors.success} />
              </TouchableOpacity>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                {quantityInCart}
              </Text>
              <TouchableOpacity
                onPress={onIncrease}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Plus size={14} color={THEME.colors.success} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={onAddQuick}
              disabled={!product.is_available}
              style={{
                backgroundColor: product.is_available
                  ? THEME.colors.primary
                  : THEME.colors.surface2,
                borderRadius: THEME.radius.sm,
                paddingHorizontal: 10,
                paddingVertical: 5,
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Plus size={12} color={THEME.colors.textInverse} />
              <Text
                style={{
                  color: THEME.colors.textInverse,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                ADD
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};
