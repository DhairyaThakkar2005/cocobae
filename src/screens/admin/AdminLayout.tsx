import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { THEME } from "../../theme/tokens";
import { useBreakpoint } from "../../theme/breakpoints";
import {
  ShoppingBag,
  Layers,
  Receipt,
  BarChart3,
  Settings,
  ArrowLeft,
  Cake,
} from "../../lib/icons";
import { ProductsScreen } from "./ProductsScreen";
import { CategoriesScreen } from "./CategoriesScreen";
import { OrderHistoryScreen } from "./OrderHistoryScreen";
import { SalesScreen } from "./SalesScreen";
import { SettingsScreen } from "./SettingsScreen";

export type AdminTab =
  | "products"
  | "categories"
  | "orders"
  | "sales"
  | "settings";

export interface AdminLayoutProps {
  onBackToPOS: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBackToPOS }) => {
  const { isTablet, isXs } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<AdminTab>("products");

  const tabs: Array<{ id: AdminTab; label: string; icon: any }> = [
    { id: "products", label: "Products", icon: Cake },
    { id: "categories", label: "Categories", icon: Layers },
    { id: "orders", label: "Orders", icon: Receipt },
    { id: "sales", label: "Sales Reports", icon: BarChart3 },
    { id: "settings", label: "Settings & Backup", icon: Settings },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.bg }}>
      {/* Admin Top Bar */}
      <View
        style={{
          backgroundColor: THEME.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={onBackToPOS}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <ArrowLeft size={20} color={THEME.colors.primary} />
          <View>
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 18,
                fontWeight: "800",
              }}
            >
              CocoBae Admin
            </Text>
            <Text
              style={{
                color: THEME.colors.primary,
                fontSize: 11,
                fontWeight: "600",
              }}
            >
              Tap to return to POS Menu
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Admin Area */}
      <View style={{ flex: 1, flexDirection: isTablet ? "row" : "column" }}>
        {/* Tablet View: Left Navigation Sidebar */}
        {isTablet && (
          <View
            style={{
              width: 220,
              backgroundColor: THEME.colors.surface,
              borderRightWidth: 1,
              borderRightColor: THEME.colors.border,
              paddingVertical: 12,
            }}
          >
            {tabs.map((t) => {
              const isActive = activeTab === t.id;
              const IconComp = t.icon;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setActiveTab(t.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: isActive
                      ? THEME.colors.primaryGlow
                      : "transparent",
                    borderLeftWidth: 3,
                    borderLeftColor: isActive
                      ? THEME.colors.primary
                      : "transparent",
                    gap: 10,
                  }}
                >
                  <IconComp
                    size={18}
                    color={
                      isActive ? THEME.colors.primary : THEME.colors.textMuted
                    }
                  />
                  <Text
                    style={{
                      color: isActive
                        ? THEME.colors.primary
                        : THEME.colors.text,
                      fontSize: 14,
                      fontWeight: isActive ? "700" : "500",
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Mobile View: Horizontal Scrollable Tabs */}
        {!isTablet && (
          <View
            style={{
              backgroundColor: THEME.colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: THEME.colors.border,
              paddingVertical: 6,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
            >
              {tabs.map((t) => {
                const isActive = activeTab === t.id;
                const IconComp = t.icon;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setActiveTab(t.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: isActive
                        ? THEME.colors.primary
                        : THEME.colors.surface2,
                      borderRadius: THEME.radius.full,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderWidth: 1,
                      borderColor: isActive
                        ? THEME.colors.primary
                        : THEME.colors.border,
                    }}
                  >
                    <IconComp
                      size={14}
                      color={
                        isActive
                          ? THEME.colors.textInverse
                          : THEME.colors.textMuted
                      }
                    />
                    <Text
                      style={{
                        color: isActive
                          ? THEME.colors.textInverse
                          : THEME.colors.text,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Active Tab Screen Content */}
        <View style={{ flex: 1 }}>
          {activeTab === "products" && <ProductsScreen />}
          {activeTab === "categories" && <CategoriesScreen />}
          {activeTab === "orders" && <OrderHistoryScreen />}
          {activeTab === "sales" && <SalesScreen />}
          {activeTab === "settings" && <SettingsScreen />}
        </View>
      </View>
    </View>
  );
};
