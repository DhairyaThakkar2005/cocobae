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
  Clock,
  Truck,
  X,
} from "../../lib/icons";
import {
  DateRange,
  StockReportItem,
  StockLogItem,
  getStockReport,
  getStockArrivalLogs,
} from "../../db/reports";
import { ReportSkeleton } from "./ReportSkeleton";
import { DateFilterBar } from "./DateFilterBar";

export interface StockReportDetailProps {
  range: DateRange;
  onRangeChange?: (range: DateRange) => void;
  onBack: () => void;
}

export const StockReportDetail: React.FC<StockReportDetailProps> = ({
  range,
  onRangeChange,
  onBack,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "history">("overview");
  const [stockItems, setStockItems] = useState<StockReportItem[]>([]);
  const [historyLogs, setHistoryLogs] = useState<StockLogItem[]>([]);
  const [totals, setTotals] = useState({
    totalOpening: 0,
    totalSold: 0,
    totalRestocked: 0,
    totalClosing: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [stockData, logData] = await Promise.all([
        getStockReport(range),
        getStockArrivalLogs(range),
      ]);
      setStockItems(stockData.items);
      setTotals({
        totalOpening: stockData.totalOpening,
        totalSold: stockData.totalSold,
        totalRestocked: stockData.totalRestocked,
        totalClosing: stockData.totalClosing,
      });
      setHistoryLogs(logData);
    } catch (err) {
      console.error("Error loading stock report:", err);
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

  // Filter stock items
  const filteredStock = stockItems.filter((item) =>
    item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter history logs
  const filteredLogs = historyLogs.filter((log) =>
    log.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.note && log.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatLogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.bg }}>
      {/* Top Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
          backgroundColor: THEME.colors.surface,
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 4,
          }}
        >
          <ArrowLeft size={18} color={THEME.colors.primary} />
          <Text
            style={{
              color: THEME.colors.primary,
              fontSize: 14,
              fontWeight: "700",
            }}
          >
            Back to Sales
          </Text>
        </TouchableOpacity>

        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 16,
              fontWeight: "800",
            }}
          >
            Stock & Inventory
          </Text>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 11,
              fontWeight: "600",
            }}
          >
            {range.label} ({range.startDate} to {range.endDate})
          </Text>
        </View>
      </View>

      {/* Date Filter Bar */}
      {onRangeChange && (
        <DateFilterBar currentRange={range} onRangeChange={onRangeChange} />
      )}

      {/* Sub-Tabs: Overview vs Arrival History */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 8,
          backgroundColor: THEME.colors.surface2,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => setActiveSubTab("overview")}
          activeOpacity={0.8}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 9,
            paddingHorizontal: 6,
            borderRadius: THEME.radius.md,
            backgroundColor:
              activeSubTab === "overview"
                ? THEME.colors.primary
                : THEME.colors.surface,
            borderWidth: 1,
            borderColor:
              activeSubTab === "overview"
                ? THEME.colors.primary
                : THEME.colors.border,
          }}
        >
          <Cake
            size={14}
            color={
              activeSubTab === "overview"
                ? THEME.colors.textInverse
                : THEME.colors.textMuted
            }
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              color:
                activeSubTab === "overview"
                  ? THEME.colors.textInverse
                  : THEME.colors.text,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            Stock Balance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSubTab("history")}
          activeOpacity={0.8}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 9,
            paddingHorizontal: 6,
            borderRadius: THEME.radius.md,
            backgroundColor:
              activeSubTab === "history"
                ? THEME.colors.primary
                : THEME.colors.surface,
            borderWidth: 1,
            borderColor:
              activeSubTab === "history"
                ? THEME.colors.primary
                : THEME.colors.border,
          }}
        >
          <Truck
            size={14}
            color={
              activeSubTab === "history"
                ? THEME.colors.textInverse
                : THEME.colors.textMuted
            }
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              color:
                activeSubTab === "history"
                  ? THEME.colors.textInverse
                  : THEME.colors.text,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            Restock History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ReportSkeleton />
        ) : (
          <>
            {/* KPI Summary Cards */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: THEME.colors.surface,
                  borderRadius: THEME.radius.md,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 10, fontWeight: "700" }}>
                  OPENING
                </Text>
                <Text style={{ color: THEME.colors.text, fontSize: 16, fontWeight: "800", marginTop: 2 }}>
                  {totals.totalOpening}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: THEME.colors.surface,
                  borderRadius: THEME.radius.md,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                }}
              >
                <Text style={{ color: THEME.colors.danger, fontSize: 10, fontWeight: "700" }}>
                  UNITS SOLD
                </Text>
                <Text style={{ color: THEME.colors.danger, fontSize: 16, fontWeight: "800", marginTop: 2 }}>
                  {totals.totalSold}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: THEME.colors.surface,
                  borderRadius: THEME.radius.md,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                }}
              >
                <Text style={{ color: THEME.colors.success, fontSize: 10, fontWeight: "700" }}>
                  RESTOCKED
                </Text>
                <Text style={{ color: THEME.colors.success, fontSize: 16, fontWeight: "800", marginTop: 2 }}>
                  +{totals.totalRestocked}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: THEME.colors.surface,
                  borderRadius: THEME.radius.md,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: THEME.colors.primary,
                }}
              >
                <Text style={{ color: THEME.colors.primary, fontSize: 10, fontWeight: "700" }}>
                  CLOSING
                </Text>
                <Text style={{ color: THEME.colors.primary, fontSize: 16, fontWeight: "800", marginTop: 2 }}>
                  {totals.totalClosing}
                </Text>
              </View>
            </View>

            {/* Search Filter */}
            <View
              style={{
                backgroundColor: THEME.colors.surface,
                borderRadius: THEME.radius.md,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                height: 40,
                marginBottom: 14,
              }}
            >
              <Search size={15} color={THEME.colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={
                  activeSubTab === "overview"
                    ? "Search dessert stock..."
                    : "Search restock history..."
                }
                placeholderTextColor={THEME.colors.textDisabled}
                style={{ flex: 1, color: THEME.colors.text, fontSize: 13 }}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={14} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* TAB 1: Stock Overview & Balance */}
            {activeSubTab === "overview" && (
              <View>
                {filteredStock.length === 0 ? (
                  <View
                    style={{
                      padding: 32,
                      alignItems: "center",
                      backgroundColor: THEME.colors.surface,
                      borderRadius: THEME.radius.lg,
                      borderWidth: 1,
                      borderColor: THEME.colors.border,
                    }}
                  >
                    <Cake size={32} color={THEME.colors.textMuted} />
                    <Text
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 14,
                        fontWeight: "600",
                        marginTop: 8,
                      }}
                    >
                      No desserts found matching search
                    </Text>
                  </View>
                ) : (
                  filteredStock.map((item) => {
                    const isOutOfStock = item.closingStock <= 0;
                    const isLowStock = !isOutOfStock && item.closingStock <= 5;

                    return (
                      <View
                        key={item.productId}
                        style={{
                          backgroundColor: THEME.colors.surface,
                          borderRadius: THEME.radius.lg,
                          borderWidth: 1,
                          borderColor: isOutOfStock
                            ? "#EF444440"
                            : isLowStock
                              ? "#F59E0B40"
                              : THEME.colors.border,
                          padding: 12,
                          marginBottom: 10,
                        }}
                      >
                        {/* Header: Name + Veg Tag + Status */}
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: item.isVeg
                                  ? THEME.colors.success
                                  : THEME.colors.nonveg,
                              }}
                            />
                            <Text
                              style={{
                                color: THEME.colors.text,
                                fontSize: 14,
                                fontWeight: "700",
                                flexShrink: 1,
                              }}
                            >
                              {item.productName}
                            </Text>
                          </View>

                          {/* Status Badge */}
                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 4,
                              backgroundColor: isOutOfStock
                                ? "rgba(239, 68, 68, 0.15)"
                                : isLowStock
                                  ? "rgba(245, 158, 11, 0.15)"
                                  : "rgba(16, 185, 129, 0.15)",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "800",
                                color: isOutOfStock
                                  ? THEME.colors.danger
                                  : isLowStock
                                    ? "#F59E0B"
                                    : THEME.colors.success,
                              }}
                            >
                              {isOutOfStock
                                ? "OUT OF STOCK"
                                : isLowStock
                                  ? "LOW STOCK"
                                  : "IN STOCK"}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={{
                            color: THEME.colors.textMuted,
                            fontSize: 11,
                            marginBottom: 10,
                          }}
                        >
                          {item.categoryName}
                        </Text>

                        {/* Stock Balance Grid */}
                        <View
                          style={{
                            flexDirection: "row",
                            backgroundColor: THEME.colors.surface2,
                            borderRadius: THEME.radius.md,
                            padding: 8,
                            justifyContent: "space-between",
                          }}
                        >
                          <View style={{ alignItems: "center", flex: 1 }}>
                            <Text style={{ color: THEME.colors.textMuted, fontSize: 9, fontWeight: "700" }}>
                              OPENING
                            </Text>
                            <Text style={{ color: THEME.colors.text, fontSize: 14, fontWeight: "800", marginTop: 2 }}>
                              {item.openingStock}
                            </Text>
                          </View>

                          <View style={{ width: 1, backgroundColor: THEME.colors.border }} />

                          <View style={{ alignItems: "center", flex: 1 }}>
                            <Text style={{ color: THEME.colors.danger, fontSize: 9, fontWeight: "700" }}>
                              SOLD
                            </Text>
                            <Text style={{ color: THEME.colors.danger, fontSize: 14, fontWeight: "800", marginTop: 2 }}>
                              {item.soldQuantity}
                            </Text>
                          </View>

                          <View style={{ width: 1, backgroundColor: THEME.colors.border }} />

                          <View style={{ alignItems: "center", flex: 1 }}>
                            <Text style={{ color: THEME.colors.success, fontSize: 9, fontWeight: "700" }}>
                              ARRIVED
                            </Text>
                            <Text style={{ color: THEME.colors.success, fontSize: 14, fontWeight: "800", marginTop: 2 }}>
                              +{item.restockedQuantity}
                            </Text>
                          </View>

                          <View style={{ width: 1, backgroundColor: THEME.colors.border }} />

                          <View style={{ alignItems: "center", flex: 1 }}>
                            <Text style={{ color: THEME.colors.primary, fontSize: 9, fontWeight: "700" }}>
                              CLOSING
                            </Text>
                            <Text
                              style={{
                                color: isOutOfStock
                                  ? THEME.colors.danger
                                  : THEME.colors.primary,
                                fontSize: 14,
                                fontWeight: "800",
                                marginTop: 2,
                              }}
                            >
                              {item.closingStock}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB 2: Restock / Arrival History */}
            {activeSubTab === "history" && (
              <View>
                {filteredLogs.length === 0 ? (
                  <View
                    style={{
                      padding: 32,
                      alignItems: "center",
                      backgroundColor: THEME.colors.surface,
                      borderRadius: THEME.radius.lg,
                      borderWidth: 1,
                      borderColor: THEME.colors.border,
                    }}
                  >
                    <Truck size={32} color={THEME.colors.textMuted} />
                    <Text
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 14,
                        fontWeight: "600",
                        marginTop: 8,
                      }}
                    >
                      No stock arrivals recorded for this period
                    </Text>
                  </View>
                ) : (
                  filteredLogs.map((log) => (
                    <View
                      key={log.id}
                      style={{
                        backgroundColor: THEME.colors.surface,
                        borderRadius: THEME.radius.lg,
                        borderWidth: 1,
                        borderColor: THEME.colors.border,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      {/* Top row: Product Name + Qty Added Badge */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: THEME.colors.text,
                            fontSize: 14,
                            fontWeight: "800",
                            flex: 1,
                          }}
                        >
                          {log.productName}
                        </Text>
                        <View
                          style={{
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: THEME.radius.full,
                            borderWidth: 1,
                            borderColor: THEME.colors.success,
                          }}
                        >
                          <Text
                            style={{
                              color: THEME.colors.success,
                              fontSize: 11,
                              fontWeight: "800",
                            }}
                          >
                            +{log.quantityChanged} Units Added
                          </Text>
                        </View>
                      </View>

                      {/* Middle row: Previous -> New Stock */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
                          Stock Balance:
                        </Text>
                        <Text style={{ color: THEME.colors.textMuted, fontSize: 12, fontWeight: "600" }}>
                          {log.previousStock} units
                        </Text>
                        <Text style={{ color: THEME.colors.primary, fontSize: 12, fontWeight: "700" }}>
                          ➔
                        </Text>
                        <Text style={{ color: THEME.colors.text, fontSize: 12, fontWeight: "800" }}>
                          {log.newStock} units
                        </Text>
                      </View>

                      {/* Bottom row: Date & Time + Note */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderTopWidth: 1,
                          borderTopColor: THEME.colors.border,
                          paddingTop: 6,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Clock size={12} color={THEME.colors.textMuted} />
                          <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>
                            {formatLogDate(log.createdAt)}
                          </Text>
                        </View>
                        {log.note ? (
                          <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontStyle: "italic" }}>
                            {log.note}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};
