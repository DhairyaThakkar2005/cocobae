import "react-native-gesture-handler";
import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { THEME } from "./src/theme/tokens";
import { initDatabase } from "./src/db/schema";
import { registerDailyBackupTask } from "./src/tasks/dailyBackupTask";
import { Order } from "./src/db/orders";

// Screens
import { HomeScreen } from "./src/screens/HomeScreen";
import { CartScreen } from "./src/screens/CartScreen";
import { CheckoutScreen } from "./src/screens/CheckoutScreen";
import { BillScreen } from "./src/screens/BillScreen";
import { AdminLayout } from "./src/screens/admin/AdminLayout";

export type AppScreen = "home" | "cart" | "checkout" | "bill" | "admin";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("home");
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        // 1. Initialize SQLite Database & Seed Data
        await initDatabase();

        // 2. Register Automated Daily Backup WorkManager Task
        await registerDailyBackupTask();
      } catch (err) {
        console.error("App init error:", err);
      } finally {
        setAppReady(true);
      }
    }

    prepareApp();
  }, []);

  if (!appReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: THEME.colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bg} />
        <ActivityIndicator color={THEME.colors.primary} size="large" />
        <Text
          style={{
            color: THEME.colors.primary,
            fontSize: 22,
            fontWeight: "900",
            marginTop: 16,
            letterSpacing: 1,
          }}
        >
          CocoBae
        </Text>
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 12,
            marginTop: 4,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Dessert Café POS
        </Text>
      </View>
    );
  }

  const handleOrderPlaced = (order: Order) => {
    setActiveOrder(order);
    setCurrentScreen("bill");
  };

  const handleNewOrder = () => {
    setActiveOrder(null);
    setCurrentScreen("home");
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: THEME.colors.bg }}
        edges={["top", "left", "right"]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={THEME.colors.surface}
        />

        {currentScreen === "home" && (
          <HomeScreen
            onNavigateCart={() => setCurrentScreen("cart")}
            onNavigateCheckout={() => setCurrentScreen("checkout")}
            onNavigateAdmin={() => setCurrentScreen("admin")}
          />
        )}

        {currentScreen === "cart" && (
          <CartScreen
            onBack={() => setCurrentScreen("home")}
            onProceedCheckout={() => setCurrentScreen("checkout")}
          />
        )}

        {currentScreen === "checkout" && (
          <CheckoutScreen
            onBack={() => setCurrentScreen("cart")}
            onOrderPlaced={handleOrderPlaced}
          />
        )}

        {currentScreen === "bill" && activeOrder && (
          <BillScreen order={activeOrder} onNewOrder={handleNewOrder} />
        )}

        {currentScreen === "admin" && (
          <AdminLayout onBackToPOS={() => setCurrentScreen("home")} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
