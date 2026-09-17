import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StatusBar,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { THEME } from "../../theme/tokens";
import {
  getOrders,
  Order,
  OrderItem,
  deleteOrder,
  updateOrder,
} from "../../db/orders";
import { getProducts, Product } from "../../db/products";
import { getAllSettings } from "../../db/settings";
import { formatINR } from "../../lib/utils";
import {
  Receipt,
  Eye,
  Clock,
  X,
  ArrowLeft,
  Trash2,
  Edit3,
  Plus,
  Minus,
  CheckCircle2,
  Banknote,
  Smartphone,
  CreditCard,
  ShoppingBag,
} from "../../lib/icons";
import { BillReceipt } from "../../components/BillReceipt";
import { Button } from "../../components/ui/button";

export const OrderHistoryScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptVisible, setReceiptVisible] = useState(false);

  // Edit Bill State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<
    "cash" | "upi" | "card"
  >("cash");
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [cafeName, setCafeName] = useState("CocoBae");
  const [upiId, setUpiId] = useState("7043338863m@pnb");

  const loadData = async () => {
    try {
      const [ordList, settings, prods] = await Promise.all([
        getOrders(100),
        getAllSettings(),
        getProducts(),
      ]);
      setOrders(ordList);
      setAvailableProducts(prods);
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

  // Delete Bill with Confirmation
  const handleDeleteOrder = (orderId: number, orderNumber: string) => {
    Alert.alert(
      `Delete Bill #${orderNumber}?`,
      "This will permanently remove this bill from the database and all sales reports. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrder(orderId);
              setOrders((prev) => prev.filter((o) => o.id !== orderId));
              if (selectedOrder?.id === orderId) {
                setReceiptVisible(false);
                setSelectedOrder(null);
              }
              Alert.alert("Deleted", `Bill #${orderNumber} has been removed.`);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete order");
            }
          },
        },
      ],
    );
  };

  // Start Edit Flow
  const handleStartEdit = (o: Order) => {
    setEditingOrder(o);
    setEditCustomerName(o.customer_name || "");
    setEditCustomerPhone(o.customer_phone || "");
    setEditPaymentMethod(o.payment_method || "cash");
    setEditItems(
      (o.items || []).map((it) => ({
        ...it,
      })),
    );
    setShowProductPicker(false);
    setEditModalVisible(true);
  };

  // Item Quantity Adjustments
  const handleUpdateItemQty = (index: number, delta: number) => {
    setEditItems((prev) => {
      const copy = [...prev];
      const target = copy[index];
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index] = {
          ...target,
          quantity: newQty,
          subtotal: newQty * target.unit_price,
        };
      }
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddProductToEdit = (prod: Product) => {
    setEditItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.product_id === prod.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        const item = copy[existingIdx];
        const newQty = item.quantity + 1;
        copy[existingIdx] = {
          ...item,
          quantity: newQty,
          subtotal: newQty * item.unit_price,
        };
        return copy;
      }
      return [
        ...prev,
        {
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          unit_price: prod.price,
          subtotal: prod.price,
        },
      ];
    });
    setShowProductPicker(false);
  };

  // Save Bill Edits
  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    if (editItems.length === 0) {
      Alert.alert("Empty Bill", "A bill must have at least one product item.");
      return;
    }

    setSavingEdit(true);
    try {
      const newTotal = editItems.reduce((sum, it) => sum + it.subtotal, 0);

      await updateOrder(
        editingOrder.id,
        {
          customer_name: editCustomerName.trim() || "Guest",
          customer_phone: editCustomerPhone.trim() || "",
          payment_method: editPaymentMethod,
          total_amount: newTotal,
        },
        editItems,
      );

      const updatedOrderObj: Order = {
        ...editingOrder,
        customer_name: editCustomerName.trim() || "Guest",
        customer_phone: editCustomerPhone.trim() || "",
        payment_method: editPaymentMethod,
        total_amount: newTotal,
        items: editItems,
      };

      setOrders((prev) =>
        prev.map((o) => (o.id === editingOrder.id ? updatedOrderObj : o)),
      );

      if (selectedOrder?.id === editingOrder.id) {
        setSelectedOrder(updatedOrderObj);
      }

      setEditModalVisible(false);
      setEditingOrder(null);
      Alert.alert(
        "Bill Updated",
        `Bill #${editingOrder.order_number} has been updated successfully!`,
      );
    } catch (err: any) {
      Alert.alert("Update Error", err.message || "Could not update bill.");
    } finally {
      setSavingEdit(false);
    }
  };

  const editTotalAmount = editItems.reduce((acc, it) => acc + it.subtotal, 0);

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
          View receipt, re-print, edit details, or delete bills.
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
              <View
                key={o.id}
                style={{
                  backgroundColor: THEME.colors.surface,
                  borderRadius: THEME.radius.lg,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                {/* Header: Order Number, Customer, & Total */}
                <TouchableOpacity
                  onPress={() => handleViewReceipt(o)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 6,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
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
                        numberOfLines={1}
                        style={{
                          color: THEME.colors.text,
                          fontSize: 13,
                          fontWeight: "600",
                          marginTop: 2,
                        }}
                      >
                        {o.customer_name || "Walk In Customer"}
                        {o.customer_phone ? ` (${o.customer_phone})` : ""}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: THEME.colors.text,
                        fontSize: 17,
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
                      marginBottom: 10,
                    }}
                  >
                    {(o.items || [])
                      .map((it) => `${it.product_name} x${it.quantity}`)
                      .join(" • ")}
                  </Text>
                </TouchableOpacity>

                {/* Footer: Date, Payment, and Action Buttons */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTopWidth: 1,
                    borderTopColor: THEME.colors.divider,
                    paddingTop: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
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
                        paddingHorizontal: 6,
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

                  {/* Bill Action Icons */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {/* View Receipt */}
                    <TouchableOpacity
                      onPress={() => handleViewReceipt(o)}
                      activeOpacity={0.7}
                      style={{
                        padding: 7,
                        borderRadius: THEME.radius.md,
                        backgroundColor: THEME.colors.surface2,
                      }}
                    >
                      <Eye size={16} color={THEME.colors.text} />
                    </TouchableOpacity>

                    {/* Edit Bill */}
                    <TouchableOpacity
                      onPress={() => handleStartEdit(o)}
                      activeOpacity={0.7}
                      style={{
                        padding: 7,
                        borderRadius: THEME.radius.md,
                        backgroundColor: "rgba(59, 130, 246, 0.15)",
                        borderWidth: 1,
                        borderColor: "rgba(59, 130, 246, 0.3)",
                      }}
                    >
                      <Edit3 size={16} color="#3B82F6" />
                    </TouchableOpacity>

                    {/* Delete Bill */}
                    <TouchableOpacity
                      onPress={() => handleDeleteOrder(o.id, o.order_number)}
                      activeOpacity={0.7}
                      style={{
                        padding: 7,
                        borderRadius: THEME.radius.md,
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        borderWidth: 1,
                        borderColor: "rgba(239, 68, 68, 0.3)",
                      }}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Full-Screen Bill View Modal */}
      <Modal
        visible={receiptVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setReceiptVisible(false)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: THEME.colors.bg }}
          edges={["top", "bottom"]}
        >
          <StatusBar
            barStyle="light-content"
            backgroundColor={THEME.colors.surface}
          />

          {/* Receipt Top Header */}
          <View
            style={{
              backgroundColor: THEME.colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: THEME.colors.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              onPress={() => setReceiptVisible(false)}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <ArrowLeft size={20} color={THEME.colors.primary} />
              <View>
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 16,
                    fontWeight: "800",
                  }}
                >
                  {selectedOrder
                    ? `Receipt #${selectedOrder.order_number}`
                    : "Bill Receipt"}
                </Text>
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 11,
                  }}
                >
                  Tap back to return to orders
                </Text>
              </View>
            </TouchableOpacity>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {selectedOrder && (
                <>
                  {/* Edit inside Receipt view */}
                  <TouchableOpacity
                    onPress={() => {
                      setReceiptVisible(false);
                      handleStartEdit(selectedOrder);
                    }}
                    style={{
                      backgroundColor: "rgba(59, 130, 246, 0.15)",
                      padding: 8,
                      borderRadius: THEME.radius.full,
                    }}
                  >
                    <Edit3 size={16} color="#3B82F6" />
                  </TouchableOpacity>

                  {/* Delete inside Receipt view */}
                  <TouchableOpacity
                    onPress={() =>
                      handleDeleteOrder(
                        selectedOrder.id,
                        selectedOrder.order_number,
                      )
                    }
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      padding: 8,
                      borderRadius: THEME.radius.full,
                    }}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                onPress={() => setReceiptVisible(false)}
                style={{
                  backgroundColor: THEME.colors.surface2,
                  padding: 8,
                  borderRadius: THEME.radius.full,
                }}
              >
                <X size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Fully Scrollable Bill Receipt */}
          <View style={{ flex: 1 }}>
            {selectedOrder && (
              <BillReceipt
                order={selectedOrder}
                cafeName={cafeName}
                upiId={upiId}
                onNewOrder={() => setReceiptVisible(false)}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Bill Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: THEME.colors.bg }}
          edges={["top", "bottom"]}
        >
          <StatusBar
            barStyle="light-content"
            backgroundColor={THEME.colors.surface}
          />

          {/* Header */}
          <View
            style={{
              backgroundColor: THEME.colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: THEME.colors.border,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 17,
                  fontWeight: "800",
                }}
              >
                Edit Bill #{editingOrder?.order_number}
              </Text>
              <Text
                style={{
                  color: THEME.colors.textMuted,
                  fontSize: 12,
                }}
              >
                Modify items, customer info, or payment method
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              style={{
                backgroundColor: THEME.colors.surface2,
                padding: 8,
                borderRadius: THEME.radius.full,
              }}
            >
              <X size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          >
            {/* Customer Details */}
            <View
              style={{
                backgroundColor: THEME.colors.surface,
                borderRadius: THEME.radius.lg,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: THEME.colors.primary,
                  fontSize: 13,
                  fontWeight: "700",
                  marginBottom: 10,
                }}
              >
                CUSTOMER DETAILS
              </Text>

              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 4,
                }}
              >
                Customer Name
              </Text>
              <TextInput
                value={editCustomerName}
                onChangeText={setEditCustomerName}
                placeholder="Walk In Customer"
                placeholderTextColor={THEME.colors.textDisabled}
                style={{
                  backgroundColor: THEME.colors.surface2,
                  borderRadius: THEME.radius.md,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: THEME.colors.text,
                  fontSize: 14,
                  marginBottom: 10,
                }}
              />

              <Text
                style={{
                  color: THEME.colors.text,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 4,
                }}
              >
                Customer Phone
              </Text>
              <TextInput
                value={editCustomerPhone}
                onChangeText={setEditCustomerPhone}
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
                placeholderTextColor={THEME.colors.textDisabled}
                style={{
                  backgroundColor: THEME.colors.surface2,
                  borderRadius: THEME.radius.md,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: THEME.colors.text,
                  fontSize: 14,
                }}
              />
            </View>

            {/* Payment Method */}
            <View
              style={{
                backgroundColor: THEME.colors.surface,
                borderRadius: THEME.radius.lg,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: THEME.colors.primary,
                  fontSize: 13,
                  fontWeight: "700",
                  marginBottom: 10,
                }}
              >
                PAYMENT METHOD
              </Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  { id: "cash", label: "Cash", icon: Banknote },
                  { id: "upi", label: "UPI / QR", icon: Smartphone },
                  { id: "card", label: "Card / POS", icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = editPaymentMethod === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() =>
                        setEditPaymentMethod(m.id as "cash" | "upi" | "card")
                      }
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: THEME.radius.md,
                        backgroundColor: isSel
                          ? THEME.colors.primary
                          : THEME.colors.surface2,
                        borderWidth: 1,
                        borderColor: isSel
                          ? THEME.colors.primary
                          : THEME.colors.border,
                      }}
                    >
                      <Icon
                        size={16}
                        color={
                          isSel
                            ? THEME.colors.textInverse
                            : THEME.colors.textMuted
                        }
                      />
                      <Text
                        style={{
                          color: isSel
                            ? THEME.colors.textInverse
                            : THEME.colors.text,
                          fontSize: 12,
                          fontWeight: "700",
                          marginTop: 4,
                        }}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Order Items */}
            <View
              style={{
                backgroundColor: THEME.colors.surface,
                borderRadius: THEME.radius.lg,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: THEME.colors.primary,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  BILL ITEMS ({editItems.length})
                </Text>

                <TouchableOpacity
                  onPress={() => setShowProductPicker(!showProductPicker)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: THEME.colors.primaryGlow,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: THEME.radius.sm,
                  }}
                >
                  <Plus size={14} color={THEME.colors.primary} />
                  <Text
                    style={{
                      color: THEME.colors.primary,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    Add Item
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Product Picker Dropdown */}
              {showProductPicker && (
                <View
                  style={{
                    backgroundColor: THEME.colors.surface2,
                    borderRadius: THEME.radius.md,
                    padding: 8,
                    marginBottom: 12,
                    maxHeight: 200,
                  }}
                >
                  <ScrollView nestedScrollEnabled={true}>
                    {availableProducts.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => handleAddProductToEdit(p)}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingVertical: 8,
                          paddingHorizontal: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: THEME.colors.border,
                        }}
                      >
                        <Text
                          style={{
                            color: THEME.colors.text,
                            fontSize: 13,
                            fontWeight: "600",
                            flex: 1,
                          }}
                        >
                          {p.name}
                        </Text>
                        <Text
                          style={{
                            color: THEME.colors.primary,
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          {formatINR(p.price)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Items List */}
              {editItems.map((it, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: idx < editItems.length - 1 ? 1 : 0,
                    borderBottomColor: THEME.colors.divider,
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: THEME.colors.text,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {it.product_name}
                    </Text>
                    <Text
                      style={{
                        color: THEME.colors.textMuted,
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {formatINR(it.unit_price)} each
                    </Text>
                  </View>

                  {/* Quantity Counter */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: THEME.colors.surface2,
                        borderRadius: THEME.radius.md,
                        borderWidth: 1,
                        borderColor: THEME.colors.border,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handleUpdateItemQty(idx, -1)}
                        style={{ padding: 6 }}
                      >
                        <Minus size={14} color={THEME.colors.text} />
                      </TouchableOpacity>

                      <Text
                        style={{
                          color: THEME.colors.text,
                          fontSize: 13,
                          fontWeight: "800",
                          minWidth: 20,
                          textAlign: "center",
                        }}
                      >
                        {it.quantity}
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleUpdateItemQty(idx, 1)}
                        style={{ padding: 6 }}
                      >
                        <Plus size={14} color={THEME.colors.text} />
                      </TouchableOpacity>
                    </View>

                    <Text
                      style={{
                        color: THEME.colors.text,
                        fontSize: 14,
                        fontWeight: "700",
                        minWidth: 55,
                        textAlign: "right",
                      }}
                    >
                      {formatINR(it.subtotal)}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleRemoveItem(idx)}
                      style={{ padding: 4 }}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Total Summary & Action Buttons */}
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
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 16,
                    fontWeight: "800",
                  }}
                >
                  Updated Total Amount
                </Text>
                <Text
                  style={{
                    color: THEME.colors.primary,
                    fontSize: 22,
                    fontWeight: "900",
                  }}
                >
                  {formatINR(editTotalAmount)}
                </Text>
              </View>
            </View>

            <Button
              variant="primary"
              onPress={handleSaveEdit}
              loading={savingEdit}
              icon={<CheckCircle2 size={18} color={THEME.colors.textInverse} />}
            >
              Save Changes to Bill
            </Button>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};
