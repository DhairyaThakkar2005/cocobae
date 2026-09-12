import React from "react";
import { View, Text, TextInput, TouchableOpacity, Image } from "react-native";
import { THEME } from "../theme/tokens";
import { Search, Settings, Cake, X } from "../lib/icons";
import { useBreakpoint } from "../theme/breakpoints";

export interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAdmin: () => void;
  cafeName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAdmin,
  cafeName = "CocoBae",
}) => {
  const { isTablet, isXs } = useBreakpoint();

  return (
    <View
      style={{
        backgroundColor: THEME.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: THEME.colors.border,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        {/* Brand Logo & Name */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#FFF8F0",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1.5,
              borderColor: THEME.colors.primary,
              overflow: "hidden",
            }}
          >
            <Image
              source={require("../../assets/logo.png")}
              style={{ width: 28, height: 28 }}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text
              style={{
                color: THEME.colors.primary,
                fontSize: isXs ? 17 : 20,
                fontWeight: "900",
                letterSpacing: 0.5,
              }}
            >
              {cafeName}
            </Text>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                fontWeight: "600",
              }}
            >
              Dessert Café POS
            </Text>
          </View>
        </View>

        {/* Admin Settings Button */}
        <TouchableOpacity
          onPress={onOpenAdmin}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: THEME.colors.surface2,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: THEME.radius.md,
            borderWidth: 1,
            borderColor: THEME.colors.border,
            gap: 6,
          }}
        >
          <Settings size={16} color={THEME.colors.primary} />
          {!isXs && (
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Admin
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View
        style={{
          backgroundColor: THEME.colors.surface2,
          borderRadius: THEME.radius.md,
          borderColor: THEME.colors.border,
          borderWidth: 1,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          height: 40,
        }}
      >
        <Search
          size={16}
          color={THEME.colors.textMuted}
          style={{ marginRight: 8 }}
        />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder='Search "cake", "waffle", "ice cream"...'
          placeholderTextColor={THEME.colors.textDisabled}
          style={{
            flex: 1,
            color: THEME.colors.text,
            fontSize: 13,
            paddingVertical: 0,
          }}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => onSearchChange("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};
