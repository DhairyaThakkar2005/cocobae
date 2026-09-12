import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { THEME } from "../../theme/tokens";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Receipt,
  Sparkles,
} from "../../lib/icons";
import {
  DateRange,
  SalesByDateItem,
  getSalesByDateReport,
} from "../../db/reports";
import { formatINR } from "../../lib/utils";
import { ReportSkeleton } from "./ReportSkeleton";

import { DateFilterBar } from "./DateFilterBar";

export interface SalesByDateDetailProps {
  range: DateRange;
  onRangeChange?: (range: DateRange) => void;
  onBack: () => void;
}

export const SalesByDateDetail: React.FC<SalesByDateDetailProps> = ({
  range,
  onRangeChange,
  onBack,
}) => {
  const [items, setItems] = useState<SalesByDateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await getSalesByDateReport(range);
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

  const totalRevenue = items.reduce((acc, i) => acc + i.revenue, 0);
  const totalOrders = items.reduce((acc, i) => acc + i.ordersCount, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

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
            Sales by Date
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
            <TrendingUp size={16} color={THEME.colors.primary} />
            <Text
              style={{
                color: THEME.colors.primary,
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 0.5,
              }}
            >
              PERIOD REVENUE SUMMARY
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
                Total Orders
              </Text>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 16,
                  fontWeight: "800",
                  marginTop: 2,
                }}
              >
                {totalOrders}
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
                Avg Order Value
              </Text>
              <Text
                style={{
                  color: THEME.colors.primary,
                  fontSize: 16,
                  fontWeight: "800",
                  marginTop: 2,
                }}
              >
                {formatINR(avgOrderValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Breakdown Section Heading */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 15,
              fontWeight: "800",
            }}
          >
            Daily Breakdown ({items.length} days)
          </Text>
        </View>

        {/* Loading State */}
        {loading ? (
          <ReportSkeleton rows={5} />
        ) : items.length === 0 ? (
          /* Empty State */
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
            <Calendar size={44} color={THEME.colors.primary} />
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 16,
                fontWeight: "800",
                marginTop: 12,
              }}
            >
              No Sales in this Period
            </Text>
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              No orders were recorded between {range.startDate} and {range.endDate}.
            </Text>
          </View>
        ) : (
          /* Daily Items List */
          <View style={{ gap: 10 }}>
            {items.map((item, idx) => (
              <View
                key={item.date}
                style={{
                  backgroundColor: THEME.colors.surface,
                  borderRadius: THEME.radius.md,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  padding: 14,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Calendar size={14} color={THEME.colors.primary} />
                    <Text
                      style={{
                        color: THEME.colors.text,
                        fontSize: 14,
                        fontWeight: "700",
                      }}
                    >
                      {item.date} {item.dayName ? `(${item.dayName})` : ""}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 12,
                        fontWeight: "500",
                      }}
                    >
                      {item.ordersCount} {item.ordersCount === 1 ? "order" : "orders"}
                    </Text>
                    <Text style={{ color: THEME.colors.border }}>•</Text>
                    <Text
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 12,
                        fontWeight: "500",
                      }}
                    >
                      AOV: {formatINR(item.aov)}
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: THEME.colors.primary,
                    fontSize: 16,
                    fontWeight: "800",
                  }}
                >
                  {formatINR(item.revenue)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};
