import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { THEME } from "../../theme/tokens";
import { ArrowLeft, Layers, Sparkles, TrendingUp } from "../../lib/icons";
import {
  DateRange,
  CategorySalesItem,
  getCategorySalesReport,
} from "../../db/reports";
import { formatINR } from "../../lib/utils";
import { ReportSkeleton } from "./ReportSkeleton";

export interface CategorySalesDetailProps {
  range: DateRange;
  onBack: () => void;
}

export const CategorySalesDetail: React.FC<CategorySalesDetailProps> = ({
  range,
  onBack,
}) => {
  const [items, setItems] = useState<CategorySalesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await getCategorySalesReport(range);
      setItems(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [range.startDate, range.endDate]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalRevenue = items.reduce((acc, c) => acc + c.totalRevenue, 0);
  const totalUnits = items.reduce((acc, c) => acc + c.unitsSold, 0);
  const topCategory = items[0];

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
            Category Sales Comparison
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
        {/* KPI & Top Category Banner */}
        <View
          style={{
            backgroundColor: THEME.colors.surface,
            borderRadius: THEME.radius.lg,
            borderWidth: 1,
            borderColor: THEME.colors.borderStrong,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <Sparkles size={16} color={THEME.colors.primary} />
            <Text
              style={{
                color: THEME.colors.primary,
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 0.5,
              }}
            >
              CATEGORY REVENUE OVERVIEW
            </Text>
          </View>

          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 28,
              fontWeight: "900",
              marginBottom: 14,
            }}
          >
            {formatINR(totalRevenue)}
          </Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: THEME.colors.surface2,
                borderRadius: THEME.radius.md,
                padding: 10,
              }}
            >
              <Text
                style={{
                  color: THEME.colors.textMuted,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                Top Category
              </Text>
              <Text
                style={{
                  color: THEME.colors.primary,
                  fontSize: 15,
                  fontWeight: "800",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {topCategory ? `${topCategory.emoji} ${topCategory.categoryName}` : "None"}
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: THEME.colors.surface2,
                borderRadius: THEME.radius.md,
                padding: 10,
              }}
            >
              <Text
                style={{
                  color: THEME.colors.textMuted,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                Total Units Sold
              </Text>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 15,
                  fontWeight: "800",
                  marginTop: 2,
                }}
              >
                {totalUnits} items
              </Text>
            </View>
          </View>
        </View>

        {/* Section Title */}
        <Text
          style={{
            color: THEME.colors.text,
            fontSize: 15,
            fontWeight: "800",
            marginBottom: 12,
          }}
        >
          Categories Share ({items.length})
        </Text>

        {/* Items List with Progress Bars */}
        {loading ? (
          <ReportSkeleton rows={5} />
        ) : items.length === 0 ? (
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
            <Layers size={44} color={THEME.colors.primary} />
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 16,
                fontWeight: "800",
                marginTop: 12,
              }}
            >
              No Category Sales
            </Text>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              No category orders recorded in this date range.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {items.map((cat, idx) => (
              <View
                key={cat.categoryName + idx}
                style={{
                  backgroundColor: THEME.colors.surface,
                  borderRadius: THEME.radius.md,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  padding: 16,
                  gap: 10,
                }}
              >
                {/* Header row */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 20 }}>{cat.emoji || "🍨"}</Text>
                    <View>
                      <Text
                        style={{
                          color: THEME.colors.text,
                          fontSize: 15,
                          fontWeight: "700",
                        }}
                      >
                        {cat.categoryName}
                      </Text>
                      <Text
                        style={{
                          color: THEME.colors.textMuted,
                          fontSize: 11,
                          fontWeight: "500",
                        }}
                      >
                        {cat.unitsSold} units sold
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        color: THEME.colors.primary,
                        fontSize: 16,
                        fontWeight: "800",
                      }}
                    >
                      {formatINR(cat.totalRevenue)}
                    </Text>
                    <Text
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {cat.percentage}% of sales
                    </Text>
                  </View>
                </View>

                {/* Progress Bar Container */}
                <View
                  style={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: THEME.colors.surface2,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.min(Math.max(cat.percentage, 3), 100)}%`,
                      backgroundColor:
                        idx === 0 ? THEME.colors.primary : THEME.colors.secondary,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};
