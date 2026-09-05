import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { THEME } from "../../theme/tokens";
import { getSalesReport, SalesReport } from "../../db/sales";
import { formatINR } from "../../lib/utils";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Banknote,
  Smartphone,
  CreditCard,
  Cake,
  ShoppingBag,
} from "../../lib/icons";
import { Card } from "../../components/ui/card";
import { useBreakpoint } from "../../theme/breakpoints";

export const SalesScreen: React.FC = () => {
  const { isTablet } = useBreakpoint();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await getSalesReport();
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !report) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={THEME.colors.primary} size="large" />
      </View>
    );
  }

  // Calculate max revenue for proportional bar heights in 7-day chart
  const maxDailyRevenue = Math.max(
    ...report.dailyRevenueChart.map((d) => d.revenue),
    1,
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: THEME.colors.bg }}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
    >
      <View style={{ marginBottom: 14 }}>
        <Text
          style={{ color: THEME.colors.text, fontSize: 18, fontWeight: "800" }}
        >
          Sales & Analytics Dashboard
        </Text>
        <Text
          style={{ color: THEME.colors.textMuted, fontSize: 12, marginTop: 2 }}
        >
          Live metrics calculated directly from on-device orders.
        </Text>
      </View>

      {/* 3 Metric Cards (Today, Week, Month) */}
      <View
        style={{
          flexDirection: isTablet ? "row" : "column",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {/* Today */}
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.colors.surface,
            borderColor: THEME.colors.borderStrong,
            borderWidth: 1,
            borderRadius: THEME.radius.lg,
            padding: 16,
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
            <TrendingUp size={16} color={THEME.colors.primary} />
            <Text
              style={{
                color: THEME.colors.primary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              TODAY'S SALES
            </Text>
          </View>
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 24,
              fontWeight: "900",
            }}
          >
            {formatINR(report.todayRevenue)}
          </Text>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {report.todayOrdersCount} orders today
          </Text>
        </View>

        {/* This Week */}
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.colors.surface,
            borderColor: THEME.colors.border,
            borderWidth: 1,
            borderRadius: THEME.radius.lg,
            padding: 16,
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
            <Calendar size={16} color={THEME.colors.secondary} />
            <Text
              style={{
                color: THEME.colors.secondary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              LAST 7 DAYS
            </Text>
          </View>
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 24,
              fontWeight: "900",
            }}
          >
            {formatINR(report.weekRevenue)}
          </Text>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {report.weekOrdersCount} orders
          </Text>
        </View>

        {/* This Month */}
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.colors.surface,
            borderColor: THEME.colors.border,
            borderWidth: 1,
            borderRadius: THEME.radius.lg,
            padding: 16,
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
            <ShoppingBag size={16} color={THEME.colors.success} />
            <Text
              style={{
                color: THEME.colors.success,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              LAST 30 DAYS
            </Text>
          </View>
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 24,
              fontWeight: "900",
            }}
          >
            {formatINR(report.monthRevenue)}
          </Text>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {report.monthOrdersCount} orders
          </Text>
        </View>
      </View>

      {/* 7-Day Revenue Visual Bar Chart */}
      <View
        style={{
          backgroundColor: THEME.colors.surface,
          borderRadius: THEME.radius.lg,
          borderWidth: 1,
          borderColor: THEME.colors.border,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: THEME.colors.text,
            fontSize: 15,
            fontWeight: "700",
            marginBottom: 4,
          }}
        >
          Weekly Sales Trend
        </Text>
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 11,
            marginBottom: 16,
          }}
        >
          Daily revenue breakdown for the past 7 days
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: 120,
            paddingTop: 10,
          }}
        >
          {report.dailyRevenueChart.map((d, i) => {
            const heightPercent = Math.max(
              8,
              (d.revenue / maxDailyRevenue) * 100,
            );
            return (
              <View key={i} style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    color: THEME.colors.primary,
                    fontSize: 9,
                    fontWeight: "700",
                    marginBottom: 4,
                  }}
                >
                  {d.revenue > 0 ? `₹${d.revenue}` : ""}
                </Text>
                <View
                  style={{
                    width: "60%",
                    height: `${heightPercent}%`,
                    backgroundColor:
                      d.revenue > 0
                        ? THEME.colors.primary
                        : THEME.colors.surface2,
                    borderRadius: 4,
                  }}
                />
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 10,
                    fontWeight: "600",
                    marginTop: 6,
                  }}
                >
                  {d.day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Top Selling Items & Payment Methods Split */}
      <View
        style={{
          flexDirection: isTablet ? "row" : "column",
          gap: 16,
        }}
      >
        {/* Top Selling Desserts */}
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.colors.surface,
            borderRadius: THEME.radius.lg,
            borderWidth: 1,
            borderColor: THEME.colors.border,
            padding: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <Cake size={18} color={THEME.colors.primary} />
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              Top Selling Desserts
            </Text>
          </View>

          {report.topSellingItems.length === 0 ? (
            <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
              No sales data recorded yet.
            </Text>
          ) : (
            report.topSellingItems.map((item, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 8,
                  borderBottomWidth:
                    idx < report.topSellingItems.length - 1 ? 1 : 0,
                  borderBottomColor: THEME.colors.divider,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      color: THEME.colors.primary,
                      fontWeight: "800",
                      fontSize: 13,
                    }}
                  >
                    #{idx + 1}
                  </Text>
                  <View>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: THEME.colors.text,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {item.product_name}
                    </Text>
                    <Text
                      style={{ color: THEME.colors.textMuted, fontSize: 11 }}
                    >
                      {item.total_qty} units sold
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {formatINR(item.total_sales)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Payment Split */}
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.colors.surface,
            borderRadius: THEME.radius.lg,
            borderWidth: 1,
            borderColor: THEME.colors.border,
            padding: 16,
          }}
        >
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 15,
              fontWeight: "700",
              marginBottom: 12,
            }}
          >
            Revenue by Payment Method
          </Text>

          <View style={{ gap: 10 }}>
            {/* Cash */}
            <View
              style={{
                backgroundColor: THEME.colors.surface2,
                borderRadius: THEME.radius.md,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Banknote size={18} color={THEME.colors.success} />
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Cash
                </Text>
              </View>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                {formatINR(report.paymentSplit.cash)}
              </Text>
            </View>

            {/* UPI */}
            <View
              style={{
                backgroundColor: THEME.colors.surface2,
                borderRadius: THEME.radius.md,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Smartphone size={18} color={THEME.colors.primary} />
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  UPI / QR
                </Text>
              </View>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                {formatINR(report.paymentSplit.upi)}
              </Text>
            </View>

            {/* Card */}
            <View
              style={{
                backgroundColor: THEME.colors.surface2,
                borderRadius: THEME.radius.md,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <CreditCard size={18} color={THEME.colors.secondary} />
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Card / POS
                </Text>
              </View>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                {formatINR(report.paymentSplit.card)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
