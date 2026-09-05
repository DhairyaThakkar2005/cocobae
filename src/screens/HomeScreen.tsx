import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { THEME } from "../theme/tokens";
import { useBreakpoint } from "../theme/breakpoints";
import { Header } from "../components/Header";
import { ProductCard } from "../components/ProductCard";
import { ProductDetailModal } from "../components/ProductDetailModal";
import { CartBar } from "../components/CartBar";
import { CartPanel } from "../components/CartPanel";
import { CategorySidebar } from "../components/CategorySidebar";
import { getProducts, Product } from "../db/products";
import { getCategories, Category } from "../db/categories";
import { getAllSettings } from "../db/settings";
import { useCartStore } from "../store/cartStore";

export interface HomeScreenProps {
  onNavigateCart: () => void;
  onNavigateCheckout: () => void;
  onNavigateAdmin: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateCart,
  onNavigateCheckout,
  onNavigateAdmin,
}) => {
  const { isTablet, gridCols, contentPadding, width } = useBreakpoint();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected product for Detail Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [cafeName, setCafeName] = useState("CocoBae");

  // Zustand cart
  const {
    items,
    addItem,
    updateQuantity,
    getItemQuantity,
    getTotalItemsCount,
    getSubtotal,
    getGrandTotal,
    setSettings,
  } = useCartStore();

  const loadData = useCallback(async () => {
    try {
      const [cats, prods, settings] = await Promise.all([
        getCategories(),
        getProducts(selectedCategoryId, searchQuery),
        getAllSettings(),
      ]);
      setCategories(cats);
      setProducts(prods);

      if (settings.cafe_name) setCafeName(settings.cafe_name);
      setSettings(
        settings.gst_enabled === "1",
        parseFloat(settings.gst_percent || "5"),
      );
    } catch (e) {
      console.error("Load data error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategoryId, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setDetailModalVisible(true);
  };

  const handleAddToCart = (
    product: Product,
    quantity: number,
    note: string,
  ) => {
    addItem(product, quantity, note);
  };

  // Card Width calculation for grid
  const availableGridWidth = isTablet
    ? width - 200 - 340 - contentPadding * 2 // minus sidebar & cart panel
    : width - contentPadding * 2;
  const gap = 12;
  const cardWidth = (availableGridWidth - gap * (gridCols - 1)) / gridCols;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.bg }}>
      {/* Top Header */}
      <Header
        cafeName={cafeName}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAdmin={onNavigateAdmin}
      />

      {/* Main Content Area */}
      <View style={{ flex: 1, flexDirection: "row" }}>
        {/* Tablet View: Left Category Sidebar */}
        {isTablet && (
          <CategorySidebar
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        )}

        {/* Center Product Grid */}
        <View style={{ flex: 1, position: "relative" }}>
          {/* Mobile View: Horizontal Scrollable Category Chips */}
          {!isTablet && (
            <View
              style={{
                backgroundColor: THEME.colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: THEME.colors.border,
                paddingVertical: 8,
              }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
              >
                {/* All Chips */}
                <TouchableOpacity
                  onPress={() => setSelectedCategoryId(0)}
                  style={{
                    backgroundColor:
                      selectedCategoryId === 0
                        ? THEME.colors.primary
                        : THEME.colors.surface2,
                    borderRadius: THEME.radius.full,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor:
                      selectedCategoryId === 0
                        ? THEME.colors.primary
                        : THEME.colors.border,
                  }}
                >
                  <Text
                    style={{
                      color:
                        selectedCategoryId === 0
                          ? THEME.colors.textInverse
                          : THEME.colors.text,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    All Items
                  </Text>
                </TouchableOpacity>

                {categories.map((c) => {
                  const isSelected = selectedCategoryId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setSelectedCategoryId(c.id)}
                      style={{
                        backgroundColor: isSelected
                          ? THEME.colors.primary
                          : THEME.colors.surface2,
                        borderRadius: THEME.radius.full,
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        borderWidth: 1,
                        borderColor: isSelected
                          ? THEME.colors.primary
                          : THEME.colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>{c.emoji || "🍨"}</Text>
                      <Text
                        style={{
                          color: isSelected
                            ? THEME.colors.textInverse
                            : THEME.colors.text,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Product Grid / List */}
          {loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator color={THEME.colors.primary} size="large" />
              <Text
                style={{
                  color: THEME.colors.textMuted,
                  marginTop: 12,
                  fontSize: 13,
                }}
              >
                Loading CocoBae Menu...
              </Text>
            </View>
          ) : products.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 24,
              }}
            >
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                No desserts found
              </Text>
              <Text
                style={{
                  color: THEME.colors.textMuted,
                  fontSize: 13,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Try changing your search term or category filter.
              </Text>
            </View>
          ) : (
            <FlatList
              data={products}
              key={gridCols} // re-render when cols change
              numColumns={gridCols}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                padding: contentPadding,
                paddingBottom: isTablet ? 24 : 90, // Leave room for floating cart bar on mobile
              }}
              columnWrapperStyle={
                gridCols > 1
                  ? {
                      justifyContent: "space-between",
                      gap,
                    }
                  : undefined
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={THEME.colors.primary}
                />
              }
              renderItem={({ item }) => {
                const qty = getItemQuantity(item.id);
                return (
                  <ProductCard
                    product={item}
                    quantityInCart={qty}
                    onPress={() => handleOpenProduct(item)}
                    onAddQuick={() => addItem(item, 1)}
                    onIncrease={() => updateQuantity(item.id, 1)}
                    onDecrease={() => updateQuantity(item.id, -1)}
                    style={{ width: cardWidth }}
                  />
                );
              }}
            />
          )}

          {/* Floating Sticky Cart Bar (Mobile Only) */}
          {!isTablet && (
            <CartBar
              totalItems={getTotalItemsCount()}
              totalAmount={getGrandTotal()}
              onPress={onNavigateCart}
            />
          )}
        </View>

        {/* Tablet View: Right Persistent Cart Panel */}
        {isTablet && <CartPanel onProceedCheckout={onNavigateCheckout} />}
      </View>

      {/* Product Detail Bottom Sheet / Modal */}
      <ProductDetailModal
        visible={detailModalVisible}
        product={selectedProduct}
        initialQuantity={
          selectedProduct ? getItemQuantity(selectedProduct.id) : 1
        }
        onClose={() => setDetailModalVisible(false)}
        onAddToCart={handleAddToCart}
      />
    </View>
  );
};
