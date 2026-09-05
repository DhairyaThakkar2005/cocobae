import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { THEME } from "../../theme/tokens";
import { getOrders, Order } from "../../db/orders";
import { getAllSettings } from "../../db/settings";
import { formatINR } from "../../lib/utils";
import { Receipt, Eye, Calendar, Clock } from "../../lib/icons";
import { Dialog } from "../../components/ui/dialog";
import { BillReceipt } from "../../components/BillReceipt";

export const OrderHistoryScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptVisible, setReceiptVisible] = useState(false);

  const [cafeName, setCafeName] = useState("CocoBae");
  const [upiId, setUpiId] = useState("cocobae@upi");

  const loadData = async () => {
    try {
      const [ordList, settings] = await Promise.all([
        getOrders(100),
        getAllSettings(),
      ]);
      setOrders(ordList);
      if (settings.cafe_name) setCafeName(settings.cafe_name);
      if (settings.upi_id) setUpiId(settings.upi_id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleViewReceipt = (o: Order) => {
    setSelectedOrder(o);
    setReceiptVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.bg, padding: 14 }}>
      <View style={{ marginBottom: 12 }}>
        <Text
          style={{ color: THEME.colors.text, fontSize: 18, fontWeight: "800" }}
        >
          Past Orders History ({orders.length})
        </Text>
        <Text
          style={{ color: THEME.colors.textMuted, fontSize: 12, marginTop: 2 }}
        >
          Tap any order to view the full bill receipt, re-print, or share.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          color={THEME.colors.primary}
          size="large"
          style={{ marginTop: 40 }}
        />
      ) : orders.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <Receipt size={48} color={THEME.colors.textDisabled} />
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 16,
              fontWeight: "700",
              marginTop: 12,
            }}
          >
            No past orders yet
          </Text>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 12,
              marginTop: 4,
            }}
          >
            Completed customer transactions will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {orders.map((o) => {
            const dateFormatted = new Date(o.order_date).toLocaleString(
              "en-IN",
              {
                dateStyle: "short",
                timeStyle: "short",
              },
            );

            return (
              <TouchableOpacity
                key={o.id}
                onPress={() => handleViewReceipt(o)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: THEME.colors.surface,
                  borderRadius: THEME.radius.lg,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
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
                      color: THEME.colors.primary,
                      fontSize: 15,
                      fontWeight: "800",
                    }}
                  >
                    {o.order_number}
                  </Text>
                  <Text
                    style={{
                      color: THEME.colors.text,
                      fontSize: 16,
                      fontWeight: "800",
                    }}
                  >
                    {formatINR(o.total_amount)}
                  </Text>
                </View>

                {/* Items Summary preview */}
                <Text
                  numberOfLines={1}
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  {(o.items || [])
                    .map((it) => `${it.product_name} (${it.quantity})`)
                    .join(" • ")}
                </Text>

                {/* Metadata row */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTopWidth: 1,
                    borderTopColor: THEME.colors.divider,
                    paddingTop: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock size={12} color={THEME.colors.textMuted} />
                    <Text
                      style={{ color: THEME.colors.textMuted, fontSize: 11 }}
                    >
                      {dateFormatted}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: THEME.colors.surface2,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: THEME.radius.sm,
                    }}
                  >
                    <Text
                      style={{
                        color: THEME.colors.primary,
                        fontSize: 10,
                        fontWeight: "700",
                        textTransform: "uppercase",
                      }}
                    >
                      {o.payment_method}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Bill View Dialog */}
      <Dialog
        visible={receiptVisible}
        onClose={() => setReceiptVisible(false)}
        title={
          selectedOrder ? `Receipt #${selectedOrder.order_number}` : "Receipt"
        }
      >
        {selectedOrder && (
          <BillReceipt
            order={selectedOrder}
            cafeName={cafeName}
            upiId={upiId}
            onNewOrder={() => setReceiptVisible(false)}
          />
        )}
      </Dialog>
    </View>
  );
};
