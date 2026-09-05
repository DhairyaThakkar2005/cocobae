import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { THEME } from "../theme/tokens";
import { Category } from "../db/categories";
import { Layers } from "../lib/icons";

export interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryId: number;
  onSelectCategory: (id: number) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  return (
    <View
      style={{
        width: 200,
        backgroundColor: THEME.colors.surface,
        borderRightWidth: 1,
        borderRightColor: THEME.colors.border,
        height: "100%",
      }}
    >
      <View
        style={{
          padding: 14,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
        }}
      >
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Menu Categories
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* All Items Option */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onSelectCategory(0)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 14,
            backgroundColor:
              selectedCategoryId === 0
                ? THEME.colors.primaryGlow
                : "transparent",
            borderLeftWidth: 3,
            borderLeftColor:
              selectedCategoryId === 0 ? THEME.colors.primary : "transparent",
            gap: 10,
          }}
        >
          <Layers
            size={18}
            color={
              selectedCategoryId === 0
                ? THEME.colors.primary
                : THEME.colors.textMuted
            }
          />
          <Text
            style={{
              color:
                selectedCategoryId === 0
                  ? THEME.colors.primary
                  : THEME.colors.text,
              fontSize: 13,
              fontWeight: selectedCategoryId === 0 ? "700" : "500",
            }}
          >
            All Items
          </Text>
        </TouchableOpacity>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.7}
              onPress={() => onSelectCategory(cat.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor: isSelected
                  ? THEME.colors.primaryGlow
                  : "transparent",
                borderLeftWidth: 3,
                borderLeftColor: isSelected
                  ? THEME.colors.primary
                  : "transparent",
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 16 }}>{cat.emoji || "🍨"}</Text>
              <Text
                numberOfLines={1}
                style={{
                  color: isSelected ? THEME.colors.primary : THEME.colors.text,
                  fontSize: 13,
                  fontWeight: isSelected ? "700" : "500",
                  flex: 1,
                }}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
