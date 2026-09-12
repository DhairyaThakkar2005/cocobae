import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { THEME } from "../../theme/tokens";
import {
  ArrowLeft,
  Search,
  Cake,
  Award,
  CircleDot,
  TrendingUp,
  X,
} from "../../lib/icons";
import {
  DateRange,
  ProductSalesItem,
  getProductSalesReport,
} from "../../db/reports";
import { formatINR } from "../../lib/utils";
import { ReportSkeleton } from "./ReportSkeleton";

import { DateFilterBar } from "./DateFilterBar";

export interface ProductSalesDetailProps {
  range: DateRange;
  onRangeChange?: (range: DateRange) => void;
  onBack: () => void;
}

export const ProductSalesDetail: React.FC<ProductSalesDetailProps> = ({
  range,
  onRangeChange,
  onBack,
}) => {
  const [items, setItems] = useState<ProductSalesItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"units" | "revenue">("units");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await getProductSalesReport(range, searchQuery);
      setItems(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [range.startDate, range.endDate, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Sort items client-side if changed
  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === "revenue") return b.totalRevenue - a.totalRevenue;
    return b.unitsSold - a.unitsSold;
  });

  const totalUnits = items.reduce((acc, i) => acc + i.unitsSold, 0);
  const totalRevenue = items.reduce((acc, i) => acc + i.totalRevenue, 0);

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return {
        bg: "rgba(245, 166, 35, 0.25)",
        border: THEME.colors.primary,
        color: THEME.colors.primary,
        text: "🥇 #1",
      };
    }
    if (index === 1) {
      return {
        bg: "rgba(200, 200, 200, 0.2)",
        border: "#C0C0C0",
        color: "#E0E0E0",
        text: "🥈 #2",
      };
    }
    if (index === 2) {
      return {
        bg: "rgba(205, 127, 50, 0.2)",
        border: "#CD7F32",
        color: "#D29054",
        text: "🥉 #3",
      };
    }
    return {
      bg: THEME.colors.surface2,
      border: THEME.colors.border,
      color: THEME.colors.textMuted,
      text: `#${index + 1}`,
    };
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.bg }}>
      {/* Top Header */}
      <View
        style={{
          backgroundColor: THEME.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: THEME.colors.surface2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={18} color={THEME.colors.primary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 18,
              fontWeight: "800",
            }}
          >
            Product Sales & Rankings
          </Text>
          <Text
            style={{
              color: THEME.colors.primary,
              fontSize: 11,
              fontWeight: "600",
            }}
          >
            {range.label} ({range.startDate} to {range.endDate})
          </Text>
        </View>
      </View>

      {/* Date Filter Bar with Custom Date option */}
      {onRangeChange && (
        <DateFilterBar currentRange={range} onRangeChange={onRangeChange} />
      )}

      {/* Search & Sort Bar */}
      <View
        style={{
          backgroundColor: THEME.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 10,
        }}
      >
        {/* Search Input */}
        <View
          style={{
            backgroundColor: THEME.colors.surface2,
            borderRadius: THEME.radius.md,
            borderWidth: 1,
            borderColor: THEME.colors.border,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            height: 42,
          }}
        >
          <Search size={16} color={THEME.colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search dessert by name..."
            placeholderTextColor={THEME.colors.textDisabled}
            style={{
              flex: 1,
              marginLeft: 8,
              color: THEME.colors.text,
              fontSize: 13,
              fontWeight: "500",
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort Chips */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            Sort by:
          </Text>
          <TouchableOpacity
            onPress={() => setSortBy("units")}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor:
                sortBy === "units"
                  ? THEME.colors.primaryGlow
                  : THEME.colors.surface2,
              borderWidth: 1,
              borderColor:
                sortBy === "units"
                  ? THEME.colors.primary
                  : THEME.colors.border,
            }}
          >
            <Text
              style={{
                color:
                  sortBy === "units"
                    ? THEME.colors.primary
                    : THEME.colors.textMuted,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              Units Sold
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSortBy("revenue")}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor:
                sortBy === "revenue"
                  ? THEME.colors.primaryGlow
                  : THEME.colors.surface2,
              borderWidth: 1,
              borderColor:
                sortBy === "revenue"
                  ? THEME.colors.primary
                  : THEME.colors.border,
            }}
          >
            <Text
              style={{
                color:
                  sortBy === "revenue"
                    ? THEME.colors.primary
                    : THEME.colors.textMuted,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              Total Revenue
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
          />
        }
      >
        {/* KPI Banner */}
        <View
          style={{
            backgroundColor: THEME.colors.surface,
            borderRadius: THEME.radius.lg,
            borderWidth: 1,
            borderColor: THEME.colors.borderStrong,
            padding: 16,
            marginBottom: 16,
            flexDirection: "row",
            justifyContent: "space-around",
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontWeight: "600" }}>
              Units Sold
            </Text>
            <Text style={{ color: THEME.colors.text, fontSize: 20, fontWeight: "900", marginTop: 2 }}>
              {totalUnits}
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: THEME.colors.border }} />
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontWeight: "600" }}>
              Total Product Sales
            </Text>
            <Text style={{ color: THEME.colors.primary, fontSize: 20, fontWeight: "900", marginTop: 2 }}>
              {formatINR(totalRevenue)}
            </Text>
          </View>
        </View>

        {/* Product Items List */}
        {loading ? (
          <ReportSkeleton rows={6} />
        ) : sortedItems.length === 0 ? (
          <View
            style={{
              backgroundColor: THEME.colors.surface,
              borderRadius: THEME.radius.lg,
              borderWidth: 1,
              borderColor: THEME.colors.border,
              padding: 32,
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <Cake size={44} color={THEME.colors.primary} />
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 16,
                fontWeight: "800",
                marginTop: 12,
              }}
            >
              No Products Found
            </Text>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              {searchQuery
                ? `No sales matched "${searchQuery}".`
                : "No products sold in this period."}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {sortedItems.map((item, idx) => {
              const badge = getRankBadge(idx);
              return (
                <View
                  key={item.productName + idx}
                  style={{
                    backgroundColor: THEME.colors.surface,
                    borderRadius: THEME.radius.md,
                    borderWidth: 1,
                    borderColor:
                      idx === 0
                        ? THEME.colors.primaryGlow
                        : THEME.colors.border,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* Rank Badge */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: badge.bg,
                      borderWidth: 1,
                      borderColor: badge.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: badge.color,
                        fontSize: 13,
                        fontWeight: "900",
                      }}
                    >
                      {badge.text}
                    </Text>
                  </View>

                  {/* Product Details */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text
                        style={{
                          color: THEME.colors.text,
                          fontSize: 15,
                          fontWeight: "700",
                          flexShrink: 1,
                        }}
                        numberOfLines={1}
                      >
                        {item.productName}
                      </Text>
                      {item.isVeg ? (
                        <CircleDot size={12} color={THEME.colors.success} />
                      ) : (
                        <CircleDot size={12} color={THEME.colors.nonveg} />
                      )}
                    </View>
                    <Text
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 11,
                        fontWeight: "500",
                      }}
                    >
                      {item.categoryName} • Avg ₹{Math.round(item.avgPrice)}/ea
                    </Text>
                  </View>

                  {/* Stats */}
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <Text
                      style={{
                        color: THEME.colors.primary,
                        fontSize: 15,
                        fontWeight: "800",
                      }}
                    >
                      {formatINR(item.totalRevenue)}
                    </Text>
                    <Text
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {item.unitsSold} {item.unitsSold === 1 ? "unit" : "units"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};
