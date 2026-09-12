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
  Users,
  User,
  Phone,
  Calendar,
  X,
  TrendingUp,
} from "../../lib/icons";
import {
  DateRange,
  CustomerSalesItem,
  getCustomerSalesReport,
} from "../../db/reports";
import { formatINR } from "../../lib/utils";
import { ReportSkeleton } from "./ReportSkeleton";

export interface CustomerSalesDetailProps {
  range: DateRange;
  onBack: () => void;
}

export const CustomerSalesDetail: React.FC<CustomerSalesDetailProps> = ({
  range,
  onBack,
}) => {
  const [items, setItems] = useState<CustomerSalesItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await getCustomerSalesReport(range, searchQuery);
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

  const totalCustomers = items.length;
  const totalRevenue = items.reduce((acc, c) => acc + c.totalSpent, 0);
  const totalOrders = items.reduce((acc, c) => acc + c.totalOrders, 0);
  const avgSpendPerCustomer =
    totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;

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
            Customer Sales & History
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

      {/* Search Bar */}
      <View
        style={{
          backgroundColor: THEME.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
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
            placeholder="Search by customer name or phone..."
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
              Total Customers
            </Text>
            <Text style={{ color: THEME.colors.text, fontSize: 20, fontWeight: "900", marginTop: 2 }}>
              {totalCustomers}
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: THEME.colors.border }} />
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontWeight: "600" }}>
              Total Orders
            </Text>
            <Text style={{ color: THEME.colors.text, fontSize: 20, fontWeight: "900", marginTop: 2 }}>
              {totalOrders}
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: THEME.colors.border }} />
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontWeight: "600" }}>
              Avg / Customer
            </Text>
            <Text style={{ color: THEME.colors.primary, fontSize: 20, fontWeight: "900", marginTop: 2 }}>
              {formatINR(avgSpendPerCustomer)}
            </Text>
          </View>
        </View>

        {/* Customer Items List */}
        {loading ? (
          <ReportSkeleton rows={6} />
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
            <Users size={44} color={THEME.colors.primary} />
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 16,
                fontWeight: "800",
                marginTop: 12,
              }}
            >
              No Customers Found
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
                ? `No customers matched "${searchQuery}".`
                : "No customer orders recorded in this period."}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {items.map((cust, idx) => {
              const formattedDate = cust.lastPurchase
                ? cust.lastPurchase.slice(0, 10)
                : "N/A";
              return (
                <View
                  key={cust.customerPhone || cust.customerName + idx}
                  style={{
                    backgroundColor: THEME.colors.surface,
                    borderRadius: THEME.radius.md,
                    borderWidth: 1,
                    borderColor: THEME.colors.border,
                    padding: 14,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: THEME.colors.surface2,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: THEME.colors.border,
                        }}
                      >
                        <User size={18} color={THEME.colors.primary} />
                      </View>
                      <View>
                        <Text
                          style={{
                            color: THEME.colors.text,
                            fontSize: 15,
                            fontWeight: "700",
                          }}
                        >
                          {cust.customerName}
                        </Text>
                        {cust.customerPhone ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 2,
                            }}
                          >
                            <Phone size={11} color={THEME.colors.textMuted} />
                            <Text
                              style={{
                                color: THEME.colors.textMuted,
                                fontSize: 12,
                                fontWeight: "500",
                              }}
                            >
                              {cust.customerPhone}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={{
                              color: THEME.colors.textDisabled,
                              fontSize: 11,
                              fontStyle: "italic",
                              marginTop: 2,
                            }}
                          >
                            No phone provided
                          </Text>
                        )}
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
                        {formatINR(cust.totalSpent)}
                      </Text>
                      <Text
                        style={{
                          color: THEME.colors.textMuted,
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {cust.totalOrders} {cust.totalOrders === 1 ? "order" : "orders"}
                      </Text>
                    </View>
                  </View>

                  {/* Customer Meta Row */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTopWidth: 1,
                      borderTopColor: THEME.colors.border,
                      paddingTop: 8,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Calendar size={12} color={THEME.colors.textMuted} />
                      <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>
                        Last visited: {formattedDate}
                      </Text>
                    </View>
                    <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>
                      Avg spend: {formatINR(cust.avgSpend)}
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
