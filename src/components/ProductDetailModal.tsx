import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { THEME } from "../theme/tokens";
import { Product } from "../db/products";
import { formatINR } from "../lib/utils";
import { QuantitySelector } from "./QuantitySelector";
import { X, Cake, Sparkles } from "../lib/icons";
import { useBreakpoint } from "../theme/breakpoints";
import { resolveProductImageUri } from "../lib/imageUtils";

export interface ProductDetailModalProps {
  visible: boolean;
  product: Product | null;
  initialQuantity?: number;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, note: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  visible,
  product,
  initialQuantity = 1,
  onClose,
  onAddToCart,
}) => {
  const { isTablet, isMobile, width } = useBreakpoint();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [cookingRequest, setCookingRequest] = useState("");

  useEffect(() => {
    if (visible) {
      setQuantity(initialQuantity > 0 ? initialQuantity : 1);
      setCookingRequest("");
    }
  }, [visible, initialQuantity, product]);

  if (!product) return null;

  const gradFrom = product.grad_from || THEME.gradients.cake[0];
  const gradTo = product.grad_to || THEME.gradients.cake[1];
  const totalItemPrice = product.price * quantity;

  const handleAdd = () => {
    onAddToCart(product, quantity, cookingRequest.trim());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.colors.overlay,
            justifyContent: isTablet ? "center" : "flex-end",
            alignItems: "center",
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                width: isTablet ? Math.min(600, width - 48) : "100%",
                maxHeight: isTablet ? "88%" : "92%",
                backgroundColor: THEME.colors.surface,
                borderTopLeftRadius: THEME.radius.xxl,
                borderTopRightRadius: THEME.radius.xxl,
                borderBottomLeftRadius: isTablet ? THEME.radius.xxl : 0,
                borderBottomRightRadius: isTablet ? THEME.radius.xxl : 0,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Close Floating Button */}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  zIndex: 20,
                  backgroundColor: "rgba(15, 10, 6, 0.8)",
                  borderRadius: THEME.radius.full,
                  padding: 8,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                }}
              >
                <X size={20} color={THEME.colors.text} />
              </TouchableOpacity>

              {/* Scrollable Content */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                {/* Product Banner / Image Header */}
                <View
                  style={{
                    height: isTablet ? 260 : 200,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {resolveProductImageUri(product.image_path) ? (
                    <Image
                      source={{ uri: resolveProductImageUri(product.image_path)! }}
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
                          backgroundColor: "rgba(0,0,0,0.3)",
                          padding: 24,
                          borderRadius: THEME.radius.full,
                        }}
                      >
                        <Cake color="#FFFFFF" size={48} />
                      </View>
                    </LinearGradient>
                  )}
                </View>

                {/* Details Section */}
                <View style={{ padding: 18 }}>
                  {/* Veg Dot + Category Name */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "rgba(15, 10, 6, 0.9)",
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
                    {product.category_name ? (
                      <Text
                        style={{
                          color: THEME.colors.primary,
                          fontSize: 12,
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {product.category_name}
                      </Text>
                    ) : null}
                  </View>

                  {/* Title */}
                  <Text
                    style={{
                      color: THEME.colors.text,
                      fontSize: 22,
                      fontWeight: "800",
                      marginBottom: 6,
                    }}
                  >
                    {product.name}
                  </Text>

                  {/* Description */}
                  <Text
                    style={{
                      color: THEME.colors.textMuted,
                      fontSize: 14,
                      lineHeight: 20,
                      marginBottom: 20,
                    }}
                  >
                    {product.description ||
                      "Freshly prepared artisanal dessert crafted with premium ingredients."}
                  </Text>

                  {/* Cooking Request Box (matching reference UI screenshot) */}
                  <View
                    style={{
                      backgroundColor: THEME.colors.surface2,
                      borderRadius: THEME.radius.lg,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: THEME.colors.border,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <Sparkles size={16} color={THEME.colors.primary} />
                      <Text
                        style={{
                          color: THEME.colors.text,
                          fontSize: 15,
                          fontWeight: "700",
                        }}
                      >
                        Add a cooking request (optional)
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 12,
                        marginBottom: 10,
                      }}
                    >
                      Special instructions for preparation (e.g. extra chocolate
                      sauce, less sweet, no nuts).
                    </Text>

                    <TextInput
                      value={cookingRequest}
                      onChangeText={setCookingRequest}
                      placeholder="e.g. Please serve warm with extra cocoa powder"
                      placeholderTextColor={THEME.colors.textDisabled}
                      multiline
                      numberOfLines={2}
                      maxLength={140}
                      style={{
                        backgroundColor: THEME.colors.surface,
                        borderRadius: THEME.radius.md,
                        borderColor: THEME.colors.border,
                        borderWidth: 1,
                        color: THEME.colors.text,
                        padding: 10,
                        fontSize: 13,
                        textAlignVertical: "top",
                        minHeight: 56,
                      }}
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Sticky Bottom Action Row matching reference image */}
              <View
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 14,
                  backgroundColor: THEME.colors.surface2,
                  borderTopWidth: 1,
                  borderTopColor: THEME.colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                {/* Quantity Pill [ - 1 + ] */}
                <QuantitySelector
                  quantity={quantity}
                  onIncrease={() => setQuantity((q) => q + 1)}
                  onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
                  size="md"
                />

                {/* Add Item Button (Green CTA with price) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleAdd}
                  style={{
                    flex: 1,
                    backgroundColor: THEME.colors.success,
                    borderRadius: THEME.radius.md,
                    paddingVertical: 13,
                    paddingHorizontal: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "800",
                    }}
                  >
                    Add item {formatINR(totalItemPrice)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
