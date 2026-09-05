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
} from "react-native";
import { THEME } from "../../theme/tokens";
import { getAllSettings, setSetting } from "../../db/settings";
import {
  performDatabaseBackup,
  getBackupFiles,
  shareBackupFile,
} from "../../tasks/dailyBackupTask";
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
} from "../../lib/icons";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Separator } from "../../components/ui/separator";

export const SettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  // Settings state
  const [cafeName, setCafeName] = useState("CocoBae");
  const [upiId, setUpiId] = useState("cocobae@upi");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstPercent, setGstPercent] = useState("5");
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupTime, setBackupTime] = useState("02:00");
  const [retentionDays, setRetentionDays] = useState("7");

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
      if (settings.upi_id) setUpiId(settings.upi_id);
      if (settings.gst_enabled) setGstEnabled(settings.gst_enabled === "1");
      if (settings.gst_percent) setGstPercent(settings.gst_percent);
      if (settings.auto_backup_enabled)
        setAutoBackupEnabled(settings.auto_backup_enabled === "1");
      if (settings.backup_time) setBackupTime(settings.backup_time);
      if (settings.retention_days) setRetentionDays(settings.retention_days);

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
        setSetting("upi_id", upiId.trim()),
        setSetting("gst_enabled", gstEnabled ? "1" : "0"),
        setSetting("gst_percent", gstPercent.trim() || "5"),
        setSetting("auto_backup_enabled", autoBackupEnabled ? "1" : "0"),
        setSetting("backup_time", backupTime.trim() || "02:00"),
        setSetting("retention_days", retentionDays.trim() || "7"),
      ]);
      Alert.alert("Saved", "Store and backup settings updated successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleManualBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await performDatabaseBackup("manual");
      if (res.success) {
        Alert.alert(
          "Backup Completed",
          `Database snapshot saved:\n${res.filename}\n\nYou can share this .db file to another phone to transfer your data.`,
        );
        loadSettingsAndBackups();
      } else {
        Alert.alert(
          "Backup Failed",
          res.error || "Could not copy SQLite database.",
        );
      }
    } finally {
      setBackupLoading(false);
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

        {/* Manual Backup Action Button */}
        <Button
          onPress={handleManualBackup}
          loading={backupLoading}
          variant="secondary"
          icon={<Database size={16} color={THEME.colors.primary} />}
          style={{ marginTop: 6 }}
        >
          Backup Database Now (Snapshot)
        </Button>
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
          To transfer your database to another Android phone, tap Share to send
          the .db file (via WhatsApp/Drive/Bluetooth).
        </Text>

        {backupFiles.length === 0 ? (
          <Text
            style={{
              color: THEME.colors.textDisabled,
              fontSize: 12,
              fontStyle: "italic",
            }}
          >
            No backup snapshots generated yet. Tap "Backup Database Now" above.
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
                <Text
                  numberOfLines={1}
                  style={{
                    color: THEME.colors.text,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {file.name}
                </Text>
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 10,
                    marginTop: 2,
                  }}
                >
                  {file.size
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : "Local SQLite DB"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleShareFile(file.uri)}
                style={{
                  backgroundColor: THEME.colors.primaryGlow,
                  padding: 8,
                  borderRadius: THEME.radius.md,
                  borderWidth: 1,
                  borderColor: THEME.colors.primary,
                }}
              >
                <Share2 size={16} color={THEME.colors.primary} />
              </TouchableOpacity>
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
    </ScrollView>
  );
};
