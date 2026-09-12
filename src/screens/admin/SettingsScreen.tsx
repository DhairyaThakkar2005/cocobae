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
} from "../../lib/icons";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";

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
  const [storePhone, setStorePhone] = useState("919999999999");
  const [storeCity, setStoreCity] = useState("Anand, Gujarat");
  const [upiId, setUpiId] = useState("cocobae@upi");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstPercent, setGstPercent] = useState("5");
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupTime, setBackupTime] = useState("02:00");
  const [retentionDays, setRetentionDays] = useState("7");
  const [backupDirUri, setBackupDirUri] = useState<string | null>(null);
  const [backupDirName, setBackupDirName] = useState<string>("App Internal Storage (CocoBae_Backups)");

  // Backup files & logs
  const [backupFiles, setBackupFiles] = useState<any[]>([]);
  const [backupLogs, setBackupLogs] = useState<BackupLogEntry[]>([]);

  const loadSettingsAndBackups = async () => {
    try {
      const [settings, files, logs] = await Promise.all([
        getAllSettings(),
        getBackupFiles(),
        getBackupLogs(10),
      ]);

      if (settings.cafe_name) setCafeName(settings.cafe_name);
      if (settings.store_phone) setStorePhone(settings.store_phone);
      if (settings.store_city) setStoreCity(settings.store_city);
      if (settings.upi_id) setUpiId(settings.upi_id);
      if (settings.gst_enabled) setGstEnabled(settings.gst_enabled === "1");
      if (settings.gst_percent) setGstPercent(settings.gst_percent);
      if (settings.auto_backup_enabled)
        setAutoBackupEnabled(settings.auto_backup_enabled === "1");
      if (settings.backup_time) setBackupTime(settings.backup_time);
      if (settings.retention_days) setRetentionDays(settings.retention_days);
      if (settings.backup_directory_uri) setBackupDirUri(settings.backup_directory_uri);
      if (settings.backup_directory_name) setBackupDirName(settings.backup_directory_name);

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
        setSetting("store_phone", storePhone.trim()),
        setSetting("store_city", storeCity.trim()),
        setSetting("upi_id", upiId.trim()),
        setSetting("gst_enabled", gstEnabled ? "1" : "0"),
        setSetting("gst_percent", gstPercent.trim() || "5"),
        setSetting("auto_backup_enabled", autoBackupEnabled ? "1" : "0"),
        setSetting("backup_time", backupTime.trim() || "02:00"),
        setSetting("retention_days", retentionDays.trim() || "7"),
      ]);
      Alert.alert("Saved", "Store, billing contact, and backup settings updated successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
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
          placeholder="e.g. Anand, Gujarat"
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

      {/* 3. Automated Daily Backup (Cron Job) Section */}
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
