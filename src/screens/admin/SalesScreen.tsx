import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  BackHandler,
} from "react-native";
import { THEME } from "../../theme/tokens";
import {
  Calendar,
  Cake,
  Users,
  Layers,
  Wallet,
  TrendingUp,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
  Banknote,
  Smartphone,
  CreditCard,
} from "../../lib/icons";
import { useBreakpoint } from "../../theme/breakpoints";
import { formatINR } from "../../lib/utils";
import {
  DateRange,
  getDateRangeBounds,
  getReportsSummary,
  ReportsSummary,
  getProductSalesReport,
  ProductSalesItem,
  getCategorySalesReport,
  CategorySalesItem,
  getPaymentReport,
  PaymentReportItem,
  getCustomerSalesReport,
  CustomerSalesItem,
} from "../../db/reports";
import { DateFilterBar } from "../../components/reports/DateFilterBar";
import { ReportSkeleton } from "../../components/reports/ReportSkeleton";
import { SalesByDateDetail } from "../../components/reports/SalesByDateDetail";
import { ProductSalesDetail } from "../../components/reports/ProductSalesDetail";
import { CustomerSalesDetail } from "../../components/reports/CustomerSalesDetail";
import { CategorySalesDetail } from "../../components/reports/CategorySalesDetail";
import { PaymentReportDetail } from "../../components/reports/PaymentReportDetail";

export type ActiveReportType =
  | "sales-by-date"
  | "product-sales"
  | "customer-sales"
  | "category-sales"
  | "payment-report"
  | null;

export const SalesScreen: React.FC = () => {
  const { isTablet } = useBreakpoint();
  const [range, setRange] = useState<DateRange>(getDateRangeBounds("today"));
  const [activeReport, setActiveReport] = useState<ActiveReportType>(null);

  const [summary, setSummary] = useState<ReportsSummary>({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalItemsSold: 0,
  });
  const [topProduct, setTopProduct] = useState<ProductSalesItem | null>(null);
  const [topCategory, setTopCategory] = useState<CategorySalesItem | null>(null);
  const [categoriesList, setCategoriesList] = useState<CategorySalesItem[]>([]);
  const [paymentItems, setPaymentItems] = useState<PaymentReportItem[]>([]);
  const [totalCustomersCount, setTotalCustomersCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [sum, prods, cats, pays, custs] = await Promise.all([
        getReportsSummary(range),
        getProductSalesReport(range),
        getCategorySalesReport(range),
        getPaymentReport(range),
        getCustomerSalesReport(range),
      ]);

      setSummary(sum);
      setTopProduct(prods[0] || null);
      setTopCategory(cats[0] || null);
      setCategoriesList(cats.slice(0, 3));
      setPaymentItems(pays.items);
      setTotalCustomersCount(custs.length);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [range.startDate, range.endDate, range.preset]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Hardware back press listener when viewing a detailed sub-report
  useEffect(() => {
    if (!activeReport) return;

    const onBackPress = () => {
      setActiveReport(null);
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [activeReport]);

  // Full-Screen Report Detail Views
  if (activeReport === "sales-by-date") {
    return <SalesByDateDetail range={range} onBack={() => setActiveReport(null)} />;
  }

  if (activeReport === "product-sales") {
    return <ProductSalesDetail range={range} onBack={() => setActiveReport(null)} />;
  }

  if (activeReport === "customer-sales") {
    return (
      <CustomerSalesDetail range={range} onBack={() => setActiveReport(null)} />
    );
  }

  if (activeReport === "category-sales") {
    return (
      <CategorySalesDetail range={range} onBack={() => setActiveReport(null)} />
    );
  }

  if (activeReport === "payment-report") {
    return (
      <PaymentReportDetail range={range} onBack={() => setActiveReport(null)} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.bg }}>
      {/* Sticky Custom Date Filter Bar */}
      <DateFilterBar currentRange={range} onRangeChange={setRange} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
          />
        }
      >
        {/* Hub Header */}
        <View style={{ marginBottom: 14 }}>
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 20,
              fontWeight: "900",
              letterSpacing: 0.2,
            }}
          >
            CocoBae Reports & Analytics
          </Text>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 12,
              marginTop: 2,
            }}
          >
            Tap any report to view deep analytics, charts, and transaction lists.
          </Text>
        </View>

        {/* Top Summary Banner */}
        <View
          style={{
            backgroundColor: THEME.colors.surface,
            borderRadius: THEME.radius.lg,
            borderWidth: 1,
            borderColor: THEME.colors.borderStrong,
            padding: 18,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TrendingUp size={16} color={THEME.colors.primary} />
              <Text
                style={{
                  color: THEME.colors.primary,
                  fontSize: 12,
                  fontWeight: "800",
                  letterSpacing: 0.5,
                }}
              >
                TOTAL REVENUE ({range.label.toUpperCase()})
              </Text>
            </View>
            <View
              style={{
                backgroundColor: THEME.colors.primaryGlow,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  color: THEME.colors.primary,
                  fontSize: 10,
                  fontWeight: "800",
                }}
              >
                LIVE METRICS
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 30,
              fontWeight: "900",
              marginVertical: 4,
            }}
          >
            {formatINR(summary.totalRevenue)}
          </Text>

          {/* Quick Metrics 3-Col */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: THEME.colors.surface2,
              borderRadius: THEME.radius.md,
              marginTop: 10,
              padding: 12,
            }}
          >
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontWeight: "600" }}>
                Total Orders
              </Text>
              <Text style={{ color: THEME.colors.text, fontSize: 16, fontWeight: "800", marginTop: 2 }}>
                {summary.totalOrders}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: THEME.colors.border }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontWeight: "600" }}>
                Avg Order Value
              </Text>
              <Text style={{ color: THEME.colors.primary, fontSize: 16, fontWeight: "800", marginTop: 2 }}>
                {formatINR(summary.avgOrderValue)}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: THEME.colors.border }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontWeight: "600" }}>
                Items Sold
              </Text>
              <Text style={{ color: THEME.colors.text, fontSize: 16, fontWeight: "800", marginTop: 2 }}>
                {summary.totalItemsSold}
              </Text>
            </View>
          </View>
        </View>

        {/* Reports Section Header */}
        <Text
          style={{
            color: THEME.colors.text,
            fontSize: 16,
            fontWeight: "800",
            marginBottom: 12,
          }}
        >
          Detailed Reports (5)
        </Text>

        {loading ? (
          <ReportSkeleton rows={5} />
        ) : (
          <View style={{ gap: 14 }}>
            {/* 1. Sales by Date Card */}
            <TouchableOpacity
              onPress={() => setActiveReport("sales-by-date")}
              activeOpacity={0.8}
              style={{
                backgroundColor: THEME.colors.surface,
                borderRadius: THEME.radius.lg,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                padding: 16,
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 8 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: THEME.colors.primaryGlow,
                      borderWidth: 1,
                      borderColor: THEME.colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Calendar size={22} color={THEME.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: THEME.colors.text,
                        fontSize: 16,
                        fontWeight: "800",
                      }}
                    >
                      Sales by Date
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 12,
                        fontWeight: "500",
                        marginTop: 2,
                      }}
                    >
                      Daily revenue, orders count & average order value
                    </Text>
                  </View>
                </View>

                <View style={{ flexShrink: 0 }}>
                  <ChevronRight size={18} color={THEME.colors.primary} />
                </View>
              </View>

              {/* Snapshot Row */}
              <View
                style={{
                  backgroundColor: THEME.colors.surface2,
                  borderRadius: THEME.radius.md,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
                  Period Volume:{" "}
                  <Text style={{ color: THEME.colors.text, fontWeight: "700" }}>
                    {summary.totalOrders} orders
                  </Text>
                </Text>
                <Text
                  style={{
                    color: THEME.colors.primary,
                    fontSize: 15,
                    fontWeight: "800",
                  }}
                >
                  {formatINR(summary.totalRevenue)}
                </Text>
              </View>
            </TouchableOpacity>

            {/* 2. Product Sales Card */}
            <TouchableOpacity
              onPress={() => setActiveReport("product-sales")}
              activeOpacity={0.8}
              style={{
                backgroundColor: THEME.colors.surface,
                borderRadius: THEME.radius.lg,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                padding: 16,
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 8 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: "rgba(232, 131, 106, 0.18)",
                      borderWidth: 1,
                      borderColor: THEME.colors.secondary,
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Cake size={22} color={THEME.colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: THEME.colors.text,
                        fontSize: 16,
                        fontWeight: "800",
                      }}
                    >
                      Product Sales & Rankings
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 12,
                        fontWeight: "500",
                        marginTop: 2,
                      }}
                    >
                      Searchable dessert sales, units sold & ranking
                    </Text>
                  </View>
                </View>

                <View style={{ flexShrink: 0 }}>
                  <ChevronRight size={18} color={THEME.colors.primary} />
                </View>
              </View>

              {/* Snapshot Row */}
              <View
                style={{
                  backgroundColor: THEME.colors.surface2,
                  borderRadius: THEME.radius.md,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 12,
                    flex: 1,
                    marginRight: 8,
                  }}
                  numberOfLines={1}
                >
                  Top Seller:{" "}
                  <Text style={{ color: THEME.colors.text, fontWeight: "700" }}>
                    {topProduct ? topProduct.productName : "None"}
                  </Text>
                </Text>
                <Text
                  style={{
                    color: THEME.colors.primary,
                    fontSize: 14,
                    fontWeight: "800",
                  }}
                >
                  {topProduct ? `${topProduct.unitsSold} sold` : "0 sold"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* 3. Customer Sales Card */}
            <TouchableOpacity
              onPress={() => setActiveReport("customer-sales")}
              activeOpacity={0.8}
              style={{
                backgroundColor: THEME.colors.surface,
                borderRadius: THEME.radius.lg,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                padding: 16,
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 8 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: "rgba(76, 175, 125, 0.18)",
                      borderWidth: 1,
                      borderColor: THEME.colors.success,
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Users size={22} color={THEME.colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: THEME.colors.text,
                        fontSize: 16,
                        fontWeight: "800",
                      }}
                    >
                      Customer Sales & History
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 12,
                        fontWeight: "500",
                        marginTop: 2,
                      }}
                    >
                      Search by name or mobile, total orders & spend
                    </Text>
                  </View>
                </View>

                <View style={{ flexShrink: 0 }}>
                  <ChevronRight size={18} color={THEME.colors.primary} />
                </View>
              </View>

              {/* Snapshot Row */}
              <View
                style={{
                  backgroundColor: THEME.colors.surface2,
                  borderRadius: THEME.radius.md,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
                  Active Customers:{" "}
                  <Text style={{ color: THEME.colors.text, fontWeight: "700" }}>
                    {totalCustomersCount} guests
                  </Text>
                </Text>
                <Text
                  style={{
                    color: THEME.colors.primary,
                    fontSize: 14,
                    fontWeight: "800",
                  }}
                >
                  View Details →
                </Text>
              </View>
            </TouchableOpacity>

            {/* 4. Category Sales Card */}
            <TouchableOpacity
              onPress={() => setActiveReport("category-sales")}
              activeOpacity={0.8}
              style={{
                backgroundColor: THEME.colors.surface,
                borderRadius: THEME.radius.lg,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                padding: 16,
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 8 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: "rgba(161, 140, 209, 0.18)",
                      borderWidth: 1,
                      borderColor: "#A18CD1",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Layers size={22} color="#A18CD1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: THEME.colors.text,
                        fontSize: 16,
                        fontWeight: "800",
                      }}
                    >
                      Category Sales Comparison
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 12,
                        fontWeight: "500",
                        marginTop: 2,
                      }}
                    >
                      Compare dessert performance with progress bars
                    </Text>
                  </View>
                </View>

                <View style={{ flexShrink: 0 }}>
                  <ChevronRight size={18} color={THEME.colors.primary} />
                </View>
              </View>

              {/* Progress bars preview */}
              {categoriesList.length > 0 ? (
                <View style={{ gap: 6 }}>
                  {categoriesList.map((c) => (
                    <View key={c.categoryName} style={{ gap: 3 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            color: THEME.colors.text,
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          {c.emoji} {c.categoryName}
                        </Text>
                        <Text
                          style={{
                            color: THEME.colors.textMuted,
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {formatINR(c.totalRevenue)} ({c.percentage}%)
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: THEME.colors.surface2,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            width: `${Math.min(Math.max(c.percentage, 4), 100)}%`,
                            backgroundColor: THEME.colors.primary,
                            borderRadius: 2,
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: THEME.colors.surface2,
                    borderRadius: THEME.radius.md,
                    padding: 10,
                  }}
                >
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
                    No category sales recorded yet
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* 5. Payment Report Card */}
            <TouchableOpacity
              onPress={() => setActiveReport("payment-report")}
              activeOpacity={0.8}
              style={{
                backgroundColor: THEME.colors.surface,
                borderRadius: THEME.radius.lg,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                padding: 16,
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 8 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: THEME.colors.primaryGlow,
                      borderWidth: 1,
                      borderColor: THEME.colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Wallet size={22} color={THEME.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: THEME.colors.text,
                        fontSize: 16,
                        fontWeight: "800",
                      }}
                    >
                      Payment Channels Report
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 12,
                        fontWeight: "500",
                        marginTop: 2,
                      }}
                    >
                      Cash, UPI/QR, and Card/POS collections
                    </Text>
                  </View>
                </View>

                <View style={{ flexShrink: 0 }}>
                  <ChevronRight size={18} color={THEME.colors.primary} />
                </View>
              </View>

              {/* Payment Split Chips */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                {paymentItems.map((p) => (
                  <View
                    key={p.method}
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
                        textTransform: "uppercase",
                      }}
                    >
                      {p.method}
                    </Text>
                    <Text
                      style={{
                        color:
                          p.method === "cash"
                            ? "#10B981"
                            : p.method === "upi"
                              ? THEME.colors.primary
                              : THEME.colors.secondary,
                        fontSize: 13,
                        fontWeight: "800",
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {formatINR(p.totalCollected)}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};
