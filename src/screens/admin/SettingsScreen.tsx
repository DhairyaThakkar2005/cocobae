import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { THEME } from "../../theme/tokens";
import { getAllSettings, setSetting } from "../../db/settings";
import { getDB, resetDatabaseToNewMenu } from "../../db/schema";
import {
  performDatabaseBackup,
  getBackupFiles,
  shareBackupFile,
  requestCustomBackupDirectory,
  exportBackupToCustomFolder,
} from "../../tasks/dailyBackupTask";
import {
  validateBackupArchive,
  restoreFullBackup,
  BackupValidationResult,
} from "../../lib/backupMigration";
import { getBackupLogs, BackupLogEntry } from "../../db/backupLog";
import {
  Settings,
  Database,
  Download,
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  FileText,
  Layers,
  FolderOpen,
  Phone,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
  Truck,
  Gift,
  Percent,
  Plus,
  Minus,
  Trash2,
  Tag,
  Users,
  Sparkles,
} from "../../lib/icons";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";
import {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  Offer,
} from "../../db/offers";
import { getCategories, Category } from "../../db/categories";
import { getProducts, Product } from "../../db/products";
import { getAllCustomers, Customer } from "../../db/customers";
import { formatINR } from "../../lib/utils";

export const SettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  // Restore state
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreTargetUri, setRestoreTargetUri] = useState<string | null>(null);
  const [restoreTargetName, setRestoreTargetName] = useState<string>("");
  const [restoreValidation, setRestoreValidation] = useState<BackupValidationResult | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  // Settings state
  const [cafeName, setCafeName] = useState("CocoBae");
  const [storeAddress, setStoreAddress] = useState(
    "GROUND FLOOR. SHOP NUMBER - 12, URBAN 01, NEAR DARSHANAM OXY, NEAR PANCHMUKHI HANUMANJI, VASNA BHAYLI ROAD , Bhayli , Vadodara",
  );
  const [storePhone, setStorePhone] = useState("7043338863");
  const [storeCity, setStoreCity] = useState("Vadodara");
  const [upiId, setUpiId] = useState("7043338863m@pnb");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstPercent, setGstPercent] = useState("5");
  const [deliveryCharge, setDeliveryCharge] = useState("30");
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupTime, setBackupTime] = useState("02:00");
  const [retentionDays, setRetentionDays] = useState("7");
  const [backupDirUri, setBackupDirUri] = useState<string | null>(null);
  const [backupDirName, setBackupDirName] = useState<string>("App Internal Storage (CocoBae_Backups)");

  // Offers & Promotions State
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [newOfferTitle, setNewOfferTitle] = useState("");
  const [newOfferType, setNewOfferType] = useState<"bxgy" | "percentage" | "flat">("bxgy");
  const [newOfferScope, setNewOfferScope] = useState<"store" | "category" | "product">("category");
  const [newOfferCategory, setNewOfferCategory] = useState<number | null>(null);
  const [newOfferProduct, setNewOfferProduct] = useState<number | null>(null);
  const [newOfferBuyQty, setNewOfferBuyQty] = useState("1");
  const [newOfferGetQty, setNewOfferGetQty] = useState("1");
  const [newOfferVal, setNewOfferVal] = useState("50");
  const [newOfferMinOrder, setNewOfferMinOrder] = useState("0");

  // Customer CRM State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [crmSearch, setCrmSearch] = useState("");

  // Backup files & logs
  const [backupFiles, setBackupFiles] = useState<any[]>([]);
  const [backupLogs, setBackupLogs] = useState<BackupLogEntry[]>([]);

  const loadSettingsAndBackups = async () => {
    try {
      const [settings, files, logs, offerList, catList, custList, prodList] =
        await Promise.all([
          getAllSettings(),
          getBackupFiles(),
          getBackupLogs(10),
          getOffers(),
          getCategories(),
          getAllCustomers(),
          getProducts(),
        ]);

      setProductsList(prodList || []);
      setOffers(offerList || []);
      setCategories(catList || []);
      setCustomers(custList || []);

      if (settings.cafe_name) setCafeName(settings.cafe_name);
      if (settings.store_address) setStoreAddress(settings.store_address);
      if (settings.store_phone) setStorePhone(settings.store_phone);
      if (settings.store_city) setStoreCity(settings.store_city);
      if (settings.upi_id) setUpiId(settings.upi_id);
      if (settings.gst_enabled) setGstEnabled(settings.gst_enabled === "1");
      if (settings.gst_percent) setGstPercent(settings.gst_percent);
      if (settings.delivery_charge !== undefined) setDeliveryCharge(settings.delivery_charge);
      if (settings.delivery_enabled !== undefined)
        setDeliveryEnabled(settings.delivery_enabled === "1");
      if (settings.auto_backup_enabled)
        setAutoBackupEnabled(settings.auto_backup_enabled === "1");
      if (settings.backup_time) setBackupTime(settings.backup_time);
      if (settings.retention_days) setRetentionDays(settings.retention_days);
      if (settings.backup_directory_uri) setBackupDirUri(settings.backup_directory_uri);
      if (settings.backup_directory_name) setBackupDirName(settings.backup_directory_name);

      setOffers(offerList);
      setCategories(catList);
      setCustomers(custList);
      setBackupFiles(files);
      setBackupLogs(logs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndBackups();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        setSetting("cafe_name", cafeName.trim()),
        setSetting("store_address", storeAddress.trim()),
        setSetting("store_phone", storePhone.trim()),
        setSetting("store_city", storeCity.trim()),
        setSetting("upi_id", upiId.trim()),
        setSetting("gst_enabled", gstEnabled ? "1" : "0"),
        setSetting("gst_percent", gstPercent.trim() || "5"),
        setSetting("delivery_charge", deliveryCharge.trim() || "0"),
        setSetting("delivery_enabled", deliveryEnabled ? "1" : "0"),
        setSetting("extra_charge_name", "Packaging / Delivery"),
        setSetting("auto_backup_enabled", autoBackupEnabled ? "1" : "0"),
        setSetting("backup_time", backupTime.trim() || "02:00"),
        setSetting("retention_days", retentionDays.trim() || "7"),
      ]);
      Alert.alert("Saved", "Store, billing, delivery charges, and system settings updated successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOffer = async (id: number, currentStatus: number) => {
    try {
      const nextStatus = currentStatus === 1 ? 0 : 1;
      await updateOffer(id, { is_active: nextStatus });
      setOffers((prev) =>
        prev.map((o) => (o.id === id ? { ...o, is_active: nextStatus } : o)),
      );
    } catch (e: any) {
      Alert.alert("Offer Error", e.message || "Could not update offer.");
    }
  };

  const handleDeleteOffer = async (id: number, title: string) => {
    Alert.alert(`Delete Offer?`, `Remove "${title}" permanently?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteOffer(id);
            setOffers((prev) => prev.filter((o) => o.id !== id));
          } catch (e: any) {
            Alert.alert("Delete Error", e.message || "Could not delete offer.");
          }
        },
      },
    ]);
  };

  const handleCreateOffer = async () => {
    if (!newOfferTitle.trim()) {
      Alert.alert("Validation", "Please enter an offer title.");
      return;
    }
    const buyQty = Math.max(1, parseInt(newOfferBuyQty, 10) || 1);
    const getQty = Math.max(1, parseInt(newOfferGetQty, 10) || 1);
    let computedVal = parseFloat(newOfferVal) || 0;
    if (newOfferType === "bxgy") {
      computedVal = Math.round((getQty / (buyQty + getQty)) * 100);
    }
    const minOrder = parseFloat(newOfferMinOrder) || 0;

    try {
      const created = await createOffer({
        title: newOfferTitle.trim(),
        offer_type: newOfferType,
        discount_value: computedVal,
        buy_qty: buyQty,
        get_qty: getQty,
        category_id: newOfferScope === "category" ? newOfferCategory : null,
        product_id: newOfferScope === "product" ? newOfferProduct : null,
        min_order_amount: minOrder,
        is_active: 1,
      });
      setOffers((prev) => [created, ...prev]);
      setShowAddOffer(false);
      setNewOfferTitle("");
      setNewOfferVal("50");
      setNewOfferBuyQty("1");
      setNewOfferGetQty("1");
      setNewOfferCategory(null);
      setNewOfferProduct(null);
      setNewOfferMinOrder("0");
      Alert.alert("Offer Created", `"${created.title}" is now active!`);
    } catch (e: any) {
      Alert.alert("Creation Error", e.message || "Could not create offer.");
    }
  };

  const handleResetDatabase = async () => {
    Alert.alert(
      "Reset Menu & Wipe Test Orders?",
      "This will clear past test orders and reload the official 34 products & 9 categories from the flyer. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Database Now",
          style: "destructive",
          onPress: async () => {
            try {
              const db = await getDB();
              await resetDatabaseToNewMenu(db);
              await loadSettingsAndBackups();
              Alert.alert(
                "Database Reset",
                "Official flyer menu with 34 items & categories loaded successfully! Test orders cleared.",
              );
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to reset database");
            }
          },
        },
      ],
    );
  };

  const handleChooseCustomBackupDir = async () => {
    const selected = await requestCustomBackupDirectory();
    if (selected) {
      setBackupDirUri(selected.uri);
      setBackupDirName(selected.name);

      // Immediately persist to SQLite so cron job & manual backup use it right away
      await Promise.all([
        setSetting("backup_directory_uri", selected.uri),
        setSetting("backup_directory_name", selected.name),
      ]);

      Alert.alert(
        "Custom Folder Configured",
        `All manual and automated 24h cron backups will now automatically save directly to:\n📁 ${selected.name}`,
      );
    }
  };

  const handleResetBackupDir = async () => {
    await Promise.all([
      setSetting("backup_directory_uri", ""),
      setSetting("backup_directory_name", "App Internal Storage (CocoBae_Backups)"),
    ]);
    setBackupDirUri(null);
    setBackupDirName("App Internal Storage (CocoBae_Backups)");
    Alert.alert("Reset", "Backup folder reset to internal app storage.");
  };

  const handleExportToFolder = async (fileUri: string, fileName: string) => {
    const success = await exportBackupToCustomFolder(fileUri, fileName);
    if (success) {
      Alert.alert("Saved Successfully", `Backup ${fileName} was saved to your chosen phone folder.`);
    }
  };

  const handleManualBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await performDatabaseBackup("manual");
      if (res.success) {
        const destMessage = res.customFolderSaved && res.customFolderName
          ? `\n\n✅ Saved directly to your chosen folder:\n📁 ${res.customFolderName}`
          : "";

        Alert.alert(
          "Full Backup Created",
          `Complete migration archive generated:\n📦 ${res.filename}\n\nIncludes database, all dessert photos, and manifest.${destMessage}`,
        );
        loadSettingsAndBackups();
      } else {
        Alert.alert(
          "Backup Failed",
          res.error || "Could not generate full backup.",
        );
      }
    } finally {
      setBackupLoading(false);
    }
  };

  const openRestoreModal = async (uri: string, name: string) => {
    setRestoreTargetUri(uri);
    setRestoreTargetName(name);
    setValidating(true);
    setRestoreModalVisible(true);
    try {
      const val = await validateBackupArchive(uri);
      setRestoreValidation(val);
    } catch (err: any) {
      setRestoreValidation({
        isValid: false,
        fileType: "zip",
        error: err.message || "Failed to inspect archive.",
      });
    } finally {
      setValidating(false);
    }
  };

  const handlePickBackupForRestore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/zip",
          "application/x-zip-compressed",
          "application/x-sqlite3",
          "application/octet-stream",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        await openRestoreModal(file.uri, file.name);
      }
    } catch (e: any) {
      Alert.alert("File Picker Error", e.message || "Could not select backup file.");
    }
  };

  const handleExecuteRestore = async () => {
    if (!restoreTargetUri) return;
    setRestoreLoading(true);
    try {
      const res = await restoreFullBackup(restoreTargetUri);
      setRestoreModalVisible(false);
      Alert.alert(
        "✅ Restore Completed!",
        `Device migration succeeded!\n\n• Products: ${res.restoredProducts}\n• Dessert Photos Restored: ${res.restoredImages}\n• Orders: ${res.restoredOrders}\n\nAll data and images are now active.`,
      );
      loadSettingsAndBackups();
    } catch (err: any) {
      Alert.alert("Restore Failed", err.message || "Could not restore backup.");
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleShareFile = async (uri: string) => {
    await shareBackupFile(uri);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={THEME.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: THEME.colors.bg }}
      contentContainerStyle={{ padding: 14, paddingBottom: 50 }}
    >
      <View style={{ marginBottom: 14 }}>
        <Text
          style={{ color: THEME.colors.text, fontSize: 18, fontWeight: "800" }}
        >
          Business & System Settings
        </Text>
        <Text
          style={{ color: THEME.colors.textMuted, fontSize: 12, marginTop: 2 }}
        >
          Configure café branding, UPI payment QR, GST taxes, and automated
          daily backup cron.
        </Text>
      </View>

      {/* 1. Branding & UPI Section */}
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
            color: THEME.colors.primary,
            fontSize: 14,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          STORE BRANDING & UPI QR
        </Text>

        <Input
          label="Café / Business Name"
          value={cafeName}
          onChangeText={setCafeName}
          placeholder="CocoBae Dessert Café"
        />

        <Input
          label="Store / Owner Mobile Number (WhatsApp)"
          value={storePhone}
          onChangeText={setStorePhone}
          placeholder="e.g. 919876543210"
          keyboardType="phone-pad"
        />
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 11,
            marginTop: -6,
            marginBottom: 10,
          }}
        >
          Displayed on receipts and used for sending WhatsApp invoices to customers.
        </Text>

        <Input
          label="Store City / Location"
          value={storeCity}
          onChangeText={setStoreCity}
          placeholder="e.g. Vadodara"
        />
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 11,
            marginTop: -6,
            marginBottom: 10,
          }}
        >
          Printed directly under café title on the customer receipt.
        </Text>

        <Input
          label="Store Full Address"
          value={storeAddress}
          onChangeText={setStoreAddress}
          placeholder="Shop Address..."
          multiline
          numberOfLines={2}
          style={{ minHeight: 60, textAlignVertical: "top" }}
        />
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 11,
            marginTop: -6,
            marginBottom: 10,
          }}
        >
          Printed directly on customer thermal bills and PDF invoices.
        </Text>

        <Input
          label="UPI ID (for Customer Payment QR Code)"
          value={upiId}
          onChangeText={setUpiId}
          placeholder="yourname@okaxis / upi"
        />
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 11,
            marginTop: -6,
            marginBottom: 10,
          }}
        >
          This UPI ID generates the QR code shown on customer bill receipts.
        </Text>
      </View>

      {/* 2. Tax / GST Section */}
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
            color: THEME.colors.primary,
            fontSize: 14,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          TAX / GST SETTINGS
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View>
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Enable GST on Orders
            </Text>
            <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>
              Add tax on top of item prices at checkout
            </Text>
          </View>
          <Switch
            value={gstEnabled}
            onValueChange={setGstEnabled}
            trackColor={{ false: "#444", true: THEME.colors.primary }}
            thumbColor="#FFF"
          />
        </View>

        {gstEnabled ? (
          <Input
            label="GST Percentage (%)"
            value={gstPercent}
            onChangeText={setGstPercent}
            placeholder="5"
            keyboardType="numeric"
          />
        ) : null}
      </View>

      {/* 3. Delivery Charges Section */}
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Truck size={16} color={THEME.colors.primary} />
          <Text
            style={{
              color: THEME.colors.primary,
              fontSize: 14,
              fontWeight: "700",
            }}
          >
            DELIVERY CHARGES ON BILL
          </Text>
        </View>

        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          Add and configure delivery charges on customer bills for takeaway / parcel / home deliveries.
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Enable Delivery Charge by Default
            </Text>
            <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>
              Automatically include delivery charge on orders at checkout
            </Text>
          </View>
          <Switch
            value={deliveryEnabled}
            onValueChange={async (val) => {
              setDeliveryEnabled(val);
              try {
                await setSetting("delivery_enabled", val ? "1" : "0");
              } catch (e) {
                console.error("Failed to save delivery_enabled:", e);
              }
            }}
            trackColor={{ false: "#444", true: THEME.colors.primary }}
            thumbColor="#FFF"
          />
        </View>

        <Input
          label="Default Delivery Charge (₹)"
          value={deliveryCharge}
          onChangeText={async (val) => {
            setDeliveryCharge(val);
            try {
              await setSetting("delivery_charge", val.trim() || "0");
            } catch (e) {
              console.error("Failed to save delivery_charge:", e);
            }
          }}
          placeholder="e.g. 30"
          keyboardType="numeric"
        />
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 11,
            marginTop: -6,
            marginBottom: 10,
          }}
        >
          Printed directly on customer thermal bill and PDF invoice under Subtotal and Discount.
        </Text>
      </View>

      {/* 4. Discounts, B1G1 & Offers Manager */}
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
            marginBottom: 8,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
            <Gift size={16} color={THEME.colors.primary} />
            <Text
              numberOfLines={1}
              style={{
                color: THEME.colors.primary,
                fontSize: 13,
                fontWeight: "700",
                flexShrink: 1,
              }}
            >
              OFFERS & DISCOUNTS ({offers.length})
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddOffer(!showAddOffer)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: THEME.colors.primaryGlow,
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: THEME.radius.md,
              borderWidth: 1,
              borderColor: THEME.colors.primary,
              flexShrink: 0,
            }}
          >
            <Plus size={14} color={THEME.colors.primary} />
            <Text style={{ color: THEME.colors.primary, fontSize: 12, fontWeight: "700" }}>
              {showAddOffer ? "Close" : "New Offer"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          Create Buy X Get Y (B1G1, B2G1, B1G2), % percentage, or flat ₹ deals. Offers adapt products on menu, cart, checkout, and receipt automatically.
        </Text>

        {/* Create New Offer Collapsible Form */}
        {showAddOffer ? (
          <View
            style={{
              backgroundColor: THEME.colors.surface2,
              borderRadius: THEME.radius.md,
              borderWidth: 1,
              borderColor: THEME.colors.borderStrong,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 13,
                fontWeight: "800",
                marginBottom: 10,
              }}
            >
              Create New Promotion / Offer
            </Text>

            <Input
              label="Offer Title"
              value={newOfferTitle}
              onChangeText={setNewOfferTitle}
              placeholder="e.g. B1G1 Cold Coco / B2G1 Donuts / 20% Off"
            />

            {/* Target Scope Selector: Storewide, Category, Specific Product */}
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 6,
              }}
            >
              Applies To (Target Scope):
            </Text>
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
              {[
                { id: "store", label: "Entire Store" },
                { id: "category", label: "Specific Category" },
                { id: "product", label: "Specific Product" },
              ].map((sc) => (
                <TouchableOpacity
                  key={sc.id}
                  onPress={() => setNewOfferScope(sc.id as any)}
                  style={{
                    flex: 1,
                    backgroundColor:
                      newOfferScope === sc.id
                        ? THEME.colors.primary
                        : THEME.colors.surface,
                    paddingVertical: 6,
                    alignItems: "center",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor:
                      newOfferScope === sc.id
                        ? THEME.colors.primary
                        : THEME.colors.border,
                  }}
                >
                  <Text
                    style={{
                      color:
                        newOfferScope === sc.id
                          ? "#FFFFFF"
                          : THEME.colors.textMuted,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {sc.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category Selector if Scope === Category */}
            {newOfferScope === "category" ? (
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 12,
                    fontWeight: "700",
                    marginBottom: 6,
                  }}
                >
                  Select Category:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {categories.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setNewOfferCategory(c.id)}
                      style={{
                        backgroundColor: newOfferCategory === c.id ? THEME.colors.primary : THEME.colors.surface,
                        paddingVertical: 5,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: newOfferCategory === c.id ? THEME.colors.primary : THEME.colors.border,
                      }}
                    >
                      <Text style={{ color: newOfferCategory === c.id ? "#FFF" : THEME.colors.text, fontSize: 12, fontWeight: "700" }}>
                        {c.emoji || "🏷️"} {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Product Selector if Scope === Product */}
            {newOfferScope === "product" ? (
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 12,
                    fontWeight: "700",
                    marginBottom: 6,
                  }}
                >
                  Select Product:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {productsList.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setNewOfferProduct(p.id)}
                      style={{
                        backgroundColor: newOfferProduct === p.id ? THEME.colors.primary : THEME.colors.surface,
                        paddingVertical: 5,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: newOfferProduct === p.id ? THEME.colors.primary : THEME.colors.border,
                      }}
                    >
                      <Text style={{ color: newOfferProduct === p.id ? "#FFF" : THEME.colors.text, fontSize: 12, fontWeight: "700" }}>
                        {p.name} (₹{p.price})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Offer Type Selector: BxGy, Percentage, Flat */}
            <Text
              style={{
                color: THEME.colors.textMuted,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 6,
              }}
            >
              Deal Type:
            </Text>
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
              {[
                { id: "bxgy", label: "Buy X Get Y (BxGy)" },
                { id: "percentage", label: "% Percentage Off" },
                { id: "flat", label: "₹ Flat Off" },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setNewOfferType(t.id as any)}
                  style={{
                    flex: 1,
                    backgroundColor:
                      newOfferType === t.id
                        ? THEME.colors.primary
                        : THEME.colors.surface,
                    paddingVertical: 6,
                    alignItems: "center",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor:
                      newOfferType === t.id
                        ? THEME.colors.primary
                        : THEME.colors.border,
                  }}
                >
                  <Text
                    style={{
                      color:
                        newOfferType === t.id
                          ? "#FFFFFF"
                          : THEME.colors.textMuted,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* BxGy Deal Configurator */}
            {newOfferType === "bxgy" ? (
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 12,
                    fontWeight: "700",
                    marginBottom: 6,
                  }}
                >
                  Quick BxGy Presets:
                </Text>
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  {[
                    { label: "B1G1", buy: "1", get: "1" },
                    { label: "B2G1", buy: "2", get: "1" },
                    { label: "B2G2", buy: "2", get: "2" },
                    { label: "B1G2", buy: "1", get: "2" },
                  ].map((preset) => {
                    const isSelected =
                      newOfferBuyQty === preset.buy && newOfferGetQty === preset.get;
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        onPress={() => {
                          setNewOfferBuyQty(preset.buy);
                          setNewOfferGetQty(preset.get);
                        }}
                        style={{
                          backgroundColor: isSelected ? THEME.colors.primary : THEME.colors.surface,
                          paddingVertical: 5,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isSelected ? THEME.colors.primary : THEME.colors.border,
                        }}
                      >
                        <Text style={{ color: isSelected ? "#FFF" : THEME.colors.text, fontSize: 12, fontWeight: "700" }}>
                          {preset.label} Free
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Buy Quantity (X)"
                      value={newOfferBuyQty}
                      onChangeText={setNewOfferBuyQty}
                      keyboardType="numeric"
                      placeholder="1"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Get Free Quantity (Y)"
                      value={newOfferGetQty}
                      onChangeText={setNewOfferGetQty}
                      keyboardType="numeric"
                      placeholder="1"
                    />
                  </View>
                </View>

                {/* Live Preview Box */}
                <View
                  style={{
                    backgroundColor: "#10B98115",
                    borderWidth: 1,
                    borderColor: "#10B98135",
                    borderRadius: THEME.radius.md,
                    padding: 10,
                    marginTop: 6,
                  }}
                >
                  <Text style={{ color: "#10B981", fontSize: 12, fontWeight: "700" }}>
                    ✨ Calculated: {Math.round(((parseInt(newOfferGetQty, 10) || 1) / ((parseInt(newOfferBuyQty, 10) || 1) + (parseInt(newOfferGetQty, 10) || 1))) * 100)}% off per unit
                  </Text>
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    Every unit adapts dynamically: 1 item is discounted accordingly on menu & bill!
                  </Text>
                </View>
              </View>
            ) : null}

            {newOfferType === "percentage" ? (
              <Input
                label="Discount Percentage (%)"
                value={newOfferVal}
                onChangeText={setNewOfferVal}
                keyboardType="numeric"
                placeholder="15"
              />
            ) : null}

            {newOfferType === "flat" ? (
              <Input
                label="Discount Flat Value (₹)"
                value={newOfferVal}
                onChangeText={setNewOfferVal}
                keyboardType="numeric"
                placeholder="50"
              />
            ) : null}

            <Input
              label="Minimum Order Value (₹) [0 for no minimum]"
              value={newOfferMinOrder}
              onChangeText={setNewOfferMinOrder}
              keyboardType="numeric"
              placeholder="0"
            />

            <Button
              onPress={handleCreateOffer}
              variant="primary"
              size="sm"
              style={{ marginTop: 6 }}
            >
              Save & Activate Offer
            </Button>
          </View>
        ) : null}

        {/* Offers List */}
        {offers.map((off) => {
          const matchedCategory = categories.find((c) => c.id === off.category_id);
          const matchedProduct = productsList.find((p) => p.id === off.product_id);
          const isBxGy = off.offer_type === "bxgy" || off.offer_type === "b1g1";
          const buyQ = off.buy_qty || 1;
          const getQ = off.get_qty || 1;

          let targetLabel = "Storewide";
          if (matchedProduct) {
            targetLabel = `Product: ${matchedProduct.name}`;
          } else if (matchedCategory) {
            targetLabel = `Category: ${matchedCategory.name}`;
          }

          let dealBadge = "";
          if (isBxGy) {
            dealBadge = `B${buyQ}G${getQ} FREE`;
          } else if (off.offer_type === "percentage" || off.offer_type === "category_discount") {
            dealBadge = `${off.discount_value}% OFF`;
          } else {
            dealBadge = `₹${off.discount_value} OFF`;
          }

          return (
            <View
              key={off.id}
              style={{
                backgroundColor: THEME.colors.surface2,
                borderRadius: THEME.radius.md,
                borderWidth: 1,
                borderColor: off.is_active ? THEME.colors.primary + "40" : THEME.colors.border,
                padding: 12,
                marginBottom: 8,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text
                    style={{
                      color: THEME.colors.text,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {off.title}
                  </Text>
                  <View
                    style={{
                      backgroundColor: off.is_active ? "#10B98120" : "#6B728020",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: off.is_active ? "#10B981" : "#9CA3AF",
                        fontSize: 10,
                        fontWeight: "800",
                      }}
                    >
                      {dealBadge}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  {isBxGy
                    ? `Buy ${buyQ} Get ${getQ} Free (${Math.round((getQ / (buyQ + getQ)) * 100)}% off per unit) • ${targetLabel}`
                    : `${dealBadge} on ${targetLabel}`}
                  {off.min_order_amount > 0 ? ` • Min ₹${off.min_order_amount}` : ""}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Switch
                  value={off.is_active === 1}
                  onValueChange={() => handleToggleOffer(off.id, off.is_active)}
                  trackColor={{ false: "#444", true: THEME.colors.success }}
                  thumbColor="#FFF"
                />
                <TouchableOpacity
                  onPress={() => handleDeleteOffer(off.id, off.title)}
                  style={{ padding: 4 }}
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* 5. Customer CRM & Repeat Loyalty Section */}
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Users size={16} color={THEME.colors.primary} />
          <Text
            style={{
              color: THEME.colors.primary,
              fontSize: 14,
              fontWeight: "700",
            }}
          >
            CUSTOMER CRM & REPEAT LOYALTY ({customers.length})
          </Text>
        </View>

        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          Customer purchase history, repeat visit counts, and lifetime value.
        </Text>

        <Input
          placeholder="Search by customer phone or name..."
          value={crmSearch}
          onChangeText={setCrmSearch}
        />

        {customers
          .filter(
            (c) =>
              c.phone.includes(crmSearch) ||
              (c.name && c.name.toLowerCase().includes(crmSearch.toLowerCase())),
          )
          .slice(0, 10)
          .map((c) => (
            <View
              key={c.id}
              style={{
                backgroundColor: THEME.colors.surface2,
                borderRadius: THEME.radius.md,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                padding: 10,
                marginBottom: 6,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ color: THEME.colors.text, fontSize: 13, fontWeight: "700" }}>
                    {c.name || "Valued Customer"}
                  </Text>
                  {c.visit_count >= 2 ? (
                    <View
                      style={{
                        backgroundColor: "#F59E0B20",
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ color: "#D97706", fontSize: 10, fontWeight: "800" }}>
                        LOYAL GUEST
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  +91 {c.phone} &bull; Visits: {c.visit_count}
                </Text>
              </View>

              <Text style={{ color: THEME.colors.primary, fontSize: 13, fontWeight: "800" }}>
                {formatINR(c.total_spent)}
              </Text>
            </View>
          ))}
      </View>

      {/* 7. Automated Daily Backup (Cron Job) Section */}
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
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <Clock size={16} color={THEME.colors.primary} />
          <Text
            style={{
              color: THEME.colors.primary,
              fontSize: 14,
              fontWeight: "700",
            }}
          >
            AUTOMATED DAILY BACKUP (CRON JOB)
          </Text>
        </View>

        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 12,
            lineHeight: 17,
            marginBottom: 14,
          }}
        >
          Runs automatically every 24 hours via Android WorkManager in the
          background (even when the app is closed). Backups are stored locally
          as date-stamped .db files.
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View>
            <Text
              style={{
                color: THEME.colors.text,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Enable Daily Auto-Backup
            </Text>
            <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>
              Schedules recurring 24h background task
            </Text>
          </View>
          <Switch
            value={autoBackupEnabled}
            onValueChange={setAutoBackupEnabled}
            trackColor={{ false: "#444", true: THEME.colors.success }}
            thumbColor="#FFF"
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Backup Schedule Time"
              value={backupTime}
              onChangeText={setBackupTime}
              placeholder="02:00 AM"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Retention (Days)"
              value={retentionDays}
              onChangeText={setRetentionDays}
              placeholder="7"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Custom Backup Storage Location (SAF) */}
        <View
          style={{
            backgroundColor: THEME.colors.surface2,
            borderRadius: THEME.radius.md,
            padding: 12,
            marginTop: 10,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: THEME.colors.divider,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <FolderOpen size={16} color={THEME.colors.primary} />
            <Text style={{ color: THEME.colors.text, fontSize: 13, fontWeight: "700" }}>
              Custom Phone Backup Location
            </Text>
          </View>
          <Text style={{ color: THEME.colors.textMuted, fontSize: 11, marginBottom: 8, lineHeight: 16 }}>
            Choose any folder on your phone (like Downloads or Documents) where you can easily find and copy your .db backup files.
          </Text>

          <View
            style={{
              backgroundColor: THEME.colors.bg,
              padding: 8,
              borderRadius: THEME.radius.sm,
              borderWidth: 1,
              borderColor: THEME.colors.border,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: THEME.colors.textMuted, fontSize: 10 }}>Current Selected Folder:</Text>
            <Text style={{ color: THEME.colors.primary, fontSize: 12, fontWeight: "600", marginTop: 2 }}>
              📁 {backupDirName}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              onPress={handleChooseCustomBackupDir}
              size="sm"
              variant="outline"
              icon={<FolderOpen size={14} color={THEME.colors.primary} />}
              style={{ flex: 1 }}
            >
              Choose Folder
            </Button>
            {backupDirUri ? (
              <Button
                onPress={handleResetBackupDir}
                size="sm"
                variant="ghost"
                style={{ flex: 1 }}
              >
                Reset Default
              </Button>
            ) : null}
          </View>
        </View>

        {/* Backup & Restore Action Buttons */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <Button
            onPress={handleManualBackup}
            loading={backupLoading}
            variant="secondary"
            icon={<Database size={16} color={THEME.colors.primary} />}
            style={{ flex: 1 }}
          >
            Create Full Backup (ZIP)
          </Button>

          <Button
            onPress={handlePickBackupForRestore}
            variant="outline"
            icon={<RotateCcw size={16} color={THEME.colors.primary} />}
            style={{ flex: 1 }}
          >
            Import & Restore
          </Button>
        </View>
      </View>

      {/* Save Settings CTA */}
      <Button
        onPress={handleSaveSettings}
        loading={saving}
        size="lg"
        variant="primary"
        style={{ marginBottom: 20 }}
      >
        Save All Settings
      </Button>

      {/* 4. Backup Snapshots & Data Transfer */}
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
            color: THEME.colors.primary,
            fontSize: 14,
            fontWeight: "700",
            marginBottom: 6,
          }}
        >
          SAVED BACKUP FILES ({backupFiles.length})
        </Text>
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          Complete .zip migration archives include all database records and dessert photos. Tap Restore to apply or Share to transfer to another phone.
        </Text>

        {backupFiles.length === 0 ? (
          <Text
            style={{
              color: THEME.colors.textDisabled,
              fontSize: 12,
              fontStyle: "italic",
            }}
          >
            No backup snapshots generated yet. Tap "Create Full Backup (ZIP)" above.
          </Text>
        ) : (
          backupFiles.map((file, idx) => (
            <View
              key={idx}
              style={{
                backgroundColor: THEME.colors.surface2,
                borderRadius: THEME.radius.md,
                padding: 10,
                marginBottom: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <View
                    style={{
                      backgroundColor: file.name.endsWith(".zip")
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(245, 166, 35, 0.2)",
                      borderRadius: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                    }}
                  >
                    <Text
                      style={{
                        color: file.name.endsWith(".zip") ? "#10B981" : THEME.colors.primary,
                        fontSize: 9,
                        fontWeight: "800",
                      }}
                    >
                      {file.name.endsWith(".zip") ? "FULL ZIP" : "SQLITE DB"}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: THEME.colors.text,
                      fontSize: 12,
                      fontWeight: "600",
                      flex: 1,
                    }}
                  >
                    {file.name}
                  </Text>
                </View>
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 10,
                    marginTop: 2,
                  }}
                >
                  {file.size
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : "Backup Archive"}
                  {file.name.endsWith(".zip") ? " • Database + Photos" : " • Database Only"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                {/* 1. Restore Action */}
                <TouchableOpacity
                  onPress={() => openRestoreModal(file.uri, file.name)}
                  style={{
                    backgroundColor: THEME.colors.primaryGlow,
                    padding: 8,
                    borderRadius: THEME.radius.md,
                    borderWidth: 1,
                    borderColor: THEME.colors.primary,
                  }}
                >
                  <RotateCcw size={15} color={THEME.colors.primary} />
                </TouchableOpacity>

                {/* 2. Export to Folder Action */}
                <TouchableOpacity
                  onPress={() => handleExportToFolder(file.uri, file.name)}
                  style={{
                    backgroundColor: THEME.colors.surface,
                    padding: 8,
                    borderRadius: THEME.radius.md,
                    borderWidth: 1,
                    borderColor: THEME.colors.border,
                  }}
                >
                  <FolderOpen size={15} color={THEME.colors.text} />
                </TouchableOpacity>

                {/* 3. Share Action */}
                <TouchableOpacity
                  onPress={() => handleShareFile(file.uri)}
                  style={{
                    backgroundColor: THEME.colors.surface,
                    padding: 8,
                    borderRadius: THEME.radius.md,
                    borderWidth: 1,
                    borderColor: THEME.colors.border,
                  }}
                >
                  <Share2 size={15} color={THEME.colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* 5. Backup Activity Log */}
      <View
        style={{
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
            fontSize: 14,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Backup Execution History
        </Text>

        {backupLogs.length === 0 ? (
          <Text style={{ color: THEME.colors.textDisabled, fontSize: 12 }}>
            No backup runs logged yet.
          </Text>
        ) : (
          backupLogs.map((log) => (
            <View
              key={log.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: THEME.colors.divider,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                {log.status === "success" ? (
                  <CheckCircle2 size={14} color={THEME.colors.success} />
                ) : (
                  <AlertCircle size={14} color={THEME.colors.danger} />
                )}
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {log.trigger_type.toUpperCase()} Backup
                </Text>
              </View>
              <Text style={{ color: THEME.colors.textMuted, fontSize: 10 }}>
                {new Date(log.backed_up_at).toLocaleString("en-IN", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Restore Confirmation & Validation Modal */}
      <Modal
        visible={restoreModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !restoreLoading && setRestoreModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.78)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.colors.surface,
              borderRadius: THEME.radius.xl,
              borderWidth: 1.5,
              borderColor: THEME.colors.primaryGlow,
              padding: 22,
              width: "100%",
              maxWidth: 420,
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <RotateCcw size={20} color={THEME.colors.primary} />
                <Text style={{ color: THEME.colors.text, fontSize: 18, fontWeight: "800" }}>
                  Restore Backup
                </Text>
              </View>
              {!restoreLoading && (
                <TouchableOpacity onPress={() => setRestoreModalVisible(false)}>
                  <X size={20} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {validating ? (
              <View style={{ paddingVertical: 30, alignItems: "center", gap: 12 }}>
                <ActivityIndicator color={THEME.colors.primary} size="large" />
                <Text style={{ color: THEME.colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                  Validating archive integrity & manifest...
                </Text>
              </View>
            ) : restoreValidation && !restoreValidation.isValid ? (
              <View style={{ gap: 14 }}>
                <View
                  style={{
                    backgroundColor: "rgba(229, 57, 53, 0.15)",
                    borderWidth: 1,
                    borderColor: THEME.colors.danger,
                    borderRadius: THEME.radius.md,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: THEME.colors.danger, fontWeight: "800", fontSize: 14 }}>
                    Validation Error
                  </Text>
                  <Text style={{ color: THEME.colors.text, fontSize: 12, marginTop: 4 }}>
                    {restoreValidation.error || "This file is not a recognized CocoBae backup archive."}
                  </Text>
                </View>

                <Button
                  onPress={() => setRestoreModalVisible(false)}
                  variant="outline"
                  style={{ marginTop: 6 }}
                >
                  Close
                </Button>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {/* Archive Info Card */}
                <View
                  style={{
                    backgroundColor: THEME.colors.surface2,
                    borderRadius: THEME.radius.md,
                    borderWidth: 1,
                    borderColor: THEME.colors.border,
                    padding: 14,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontWeight: "600" }}>
                    BACKUP ARCHIVE
                  </Text>
                  <Text style={{ color: THEME.colors.text, fontSize: 13, fontWeight: "700" }}>
                    📁 {restoreTargetName}
                  </Text>

                  <Separator />

                  {restoreValidation?.manifest ? (
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>Created:</Text>
                        <Text style={{ color: THEME.colors.text, fontSize: 12, fontWeight: "600" }}>
                          {new Date(restoreValidation.manifest.createdAt).toLocaleString()}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>Products:</Text>
                        <Text style={{ color: THEME.colors.primary, fontSize: 12, fontWeight: "700" }}>
                          {restoreValidation.manifest.productCount} items
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>Dessert Photos:</Text>
                        <Text style={{ color: "#10B981", fontSize: 12, fontWeight: "700" }}>
                          {restoreValidation.imageCount ?? restoreValidation.manifest.imageCount} photos included
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
                      Legacy SQLite database snapshot.
                    </Text>
                  )}
                </View>

                {/* Safety Backup Protection Notice */}
                <View
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    borderRadius: THEME.radius.md,
                    borderWidth: 1,
                    borderColor: "#10B981",
                    padding: 12,
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <ShieldCheck size={20} color="#10B981" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#10B981", fontWeight: "800", fontSize: 12 }}>
                      Automatic Safety Backup Active
                    </Text>
                    <Text style={{ color: THEME.colors.text, fontSize: 11, marginTop: 2, lineHeight: 15 }}>
                      A safety snapshot of your current database and photos will be saved before restoring. If anything goes wrong, changes are automatically rolled back.
                    </Text>
                  </View>
                </View>

                {/* Warning note */}
                <Text style={{ color: THEME.colors.textMuted, fontSize: 11, fontStyle: "italic", textAlign: "center" }}>
                  Current menu, categories, and orders will be replaced with this backup.
                </Text>

                {/* Modal Buttons */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                  <Button
                    onPress={() => setRestoreModalVisible(false)}
                    variant="ghost"
                    disabled={restoreLoading}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={handleExecuteRestore}
                    variant="primary"
                    loading={restoreLoading}
                    icon={<RotateCcw size={16} color="#FFF" />}
                    style={{ flex: 1 }}
                  >
                    Confirm & Restore
                  </Button>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
