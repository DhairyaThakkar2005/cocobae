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
  Banknote,
  Smartphone,
  CreditCard,
  Wallet,
  TrendingUp,
  Sparkles,
} from "../../lib/icons";
import {
  DateRange,
  PaymentReportItem,
  getPaymentReport,
} from "../../db/reports";
import { formatINR } from "../../lib/utils";
import { ReportSkeleton } from "./ReportSkeleton";
import { DateFilterBar } from "./DateFilterBar";

export interface PaymentReportDetailProps {
  range: DateRange;
  onRangeChange?: (range: DateRange) => void;
  onBack: () => void;
}

export const PaymentReportDetail: React.FC<PaymentReportDetailProps> = ({
  range,
  onRangeChange,
  onBack,
}) => {
  const [items, setItems] = useState<PaymentReportItem[]>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await getPaymentReport(range);
      setItems(data.items);
      setTotalCollected(data.totalCollected);
      setTotalTransactions(data.totalTransactions);
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

  const getMethodConfig = (method: "cash" | "upi" | "card") => {
    switch (method) {
      case "cash":
        return {
          icon: Banknote,
          color: "#10B981",
          glow: "rgba(16, 185, 129, 0.18)",
          tag: "Physical Currency",
        };
      case "upi":
        return {
          icon: Smartphone,
          color: THEME.colors.primary,
          glow: THEME.colors.primaryGlow,
          tag: "GPay / PhonePe / Paytm",
        };
      case "card":
        return {
          icon: CreditCard,
          color: THEME.colors.secondary,
          glow: "rgba(232, 131, 106, 0.18)",
          tag: "POS Swipe / Tap",
        };
    }
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
            Payment Collections Report
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
            marginBottom: 18,
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
            <Wallet size={16} color={THEME.colors.primary} />
            <Text
              style={{
                color: THEME.colors.primary,
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 0.5,
              }}
            >
              TOTAL COLLECTIONS
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
            {formatINR(totalCollected)}
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
                Transactions
              </Text>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 16,
                  fontWeight: "800",
                  marginTop: 2,
                }}
              >
                {totalTransactions} total
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
                Average Ticket
              </Text>
              <Text
                style={{
                  color: THEME.colors.primary,
                  fontSize: 16,
                  fontWeight: "800",
                  marginTop: 2,
                }}
              >
                {totalTransactions > 0
                  ? formatINR(Math.round(totalCollected / totalTransactions))
                  : "₹0"}
              </Text>
            </View>
          </View>
        </View>

        {/* Breakdown Title */}
        <Text
          style={{
            color: THEME.colors.text,
            fontSize: 15,
            fontWeight: "800",
            marginBottom: 12,
          }}
        >
          Payment Channels Breakdown
        </Text>

        {/* 3 Payment Cards */}
        {loading ? (
          <ReportSkeleton rows={3} />
        ) : (
          <View style={{ gap: 14 }}>
            {items.map((item) => {
              const cfg = getMethodConfig(item.method);
              const IconComponent = cfg.icon;

              return (
                <View
                  key={item.method}
                  style={{
                    backgroundColor: THEME.colors.surface,
                    borderRadius: THEME.radius.lg,
                    borderWidth: 1,
                    borderColor: THEME.colors.border,
                    padding: 16,
                    gap: 12,
                  }}
                >
                  {/* Top Row */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          backgroundColor: cfg.glow,
                          borderWidth: 1.5,
                          borderColor: cfg.color,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconComponent size={22} color={cfg.color} />
                      </View>

                      <View>
                        <Text
                          style={{
                            color: THEME.colors.text,
                            fontSize: 16,
                            fontWeight: "800",
                          }}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={{
                            color: THEME.colors.textMuted,
                            fontSize: 11,
                            fontWeight: "500",
                          }}
                        >
                          {cfg.tag}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          color: cfg.color,
                          fontSize: 18,
                          fontWeight: "900",
                        }}
                      >
                        {formatINR(item.totalCollected)}
                      </Text>
                      <Text
                        style={{
                          color: THEME.colors.textMuted,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {item.percentage}% share
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: THEME.colors.surface2,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${Math.min(Math.max(item.percentage, 0), 100)}%`,
                        backgroundColor: cfg.color,
                        borderRadius: 3,
                      }}
                    />
                  </View>

                  {/* Metrics Row */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: THEME.colors.surface2,
                      borderRadius: THEME.radius.md,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
                      Transactions:{" "}
                      <Text style={{ color: THEME.colors.text, fontWeight: "700" }}>
                        {item.txCount}
                      </Text>
                    </Text>

                    <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
                      Avg Ticket:{" "}
                      <Text style={{ color: THEME.colors.text, fontWeight: "700" }}>
                        {formatINR(item.avgTicket)}
                      </Text>
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
