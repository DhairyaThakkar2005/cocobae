import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { THEME } from "../../theme/tokens";
import { Calendar, CalendarRange, X, CheckCircle2, Clock } from "../../lib/icons";
import { DatePreset, DateRange, getDateRangeBounds } from "../../db/reports";

export interface DateFilterBarProps {
  currentRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  currentRange,
  onRangeChange,
}) => {
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customStart, setCustomStart] = useState(currentRange.startDate);
  const [customEnd, setCustomEnd] = useState(currentRange.endDate);

  const chips: Array<{ id: DatePreset; label: string }> = [
    { id: "today", label: "Today" },
    { id: "week", label: "Last 7 Days" },
    { id: "month", label: "Last 30 Days" },
    { id: "custom", label: "Custom Range" },
  ];

  const handleChipPress = (preset: DatePreset) => {
    if (preset === "custom") {
      setCustomModalVisible(true);
      return;
    }
    const newRange = getDateRangeBounds(preset);
    onRangeChange(newRange);
  };

  const validateAndApplyCustomRange = () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(customStart.trim()) || !dateRegex.test(customEnd.trim())) {
      Alert.alert(
        "Invalid Date Format",
        "Please use YYYY-MM-DD format (e.g. 2026-09-01).",
      );
      return;
    }

    if (customStart.trim() > customEnd.trim()) {
      Alert.alert("Invalid Range", "Start date cannot be after end date.");
      return;
    }

    const newRange = getDateRangeBounds("custom", customStart.trim(), customEnd.trim());
    onRangeChange(newRange);
    setCustomModalVisible(false);
  };

  return (
    <>
      <View
        style={{
          backgroundColor: THEME.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
          paddingVertical: 10,
          paddingHorizontal: 14,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, alignItems: "center" }}
        >
          {chips.map((chip) => {
            const isActive = currentRange.preset === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => handleChipPress(chip.id)}
                activeOpacity={0.75}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: THEME.radius.full,
                  backgroundColor: isActive
                    ? THEME.colors.primaryGlow
                    : THEME.colors.surface2,
                  borderWidth: 1.2,
                  borderColor: isActive
                    ? THEME.colors.primary
                    : THEME.colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {chip.id === "custom" ? (
                  <CalendarRange
                    size={14}
                    color={isActive ? THEME.colors.primary : THEME.colors.textMuted}
                  />
                ) : (
                  <Clock
                    size={14}
                    color={isActive ? THEME.colors.primary : THEME.colors.textMuted}
                  />
                )}
                <Text
                  style={{
                    color: isActive ? THEME.colors.primary : THEME.colors.textMuted,
                    fontSize: 12,
                    fontWeight: isActive ? "800" : "600",
                  }}
                >
                  {chip.id === "custom" && currentRange.preset === "custom"
                    ? `${currentRange.startDate} → ${currentRange.endDate}`
                    : chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Custom Date Range Modal */}
      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
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
              padding: 20,
              width: "100%",
              maxWidth: 400,
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
                <CalendarRange size={20} color={THEME.colors.primary} />
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 17,
                    fontWeight: "800",
                  }}
                >
                  Pick Custom Date Range
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCustomModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={{ gap: 14, marginBottom: 20 }}>
              <View>
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 12,
                    fontWeight: "700",
                    marginBottom: 6,
                  }}
                >
                  START DATE (YYYY-MM-DD)
                </Text>
                <TextInput
                  value={customStart}
                  onChangeText={setCustomStart}
                  placeholder="2026-09-01"
                  placeholderTextColor={THEME.colors.textDisabled}
                  style={{
                    backgroundColor: THEME.colors.surface2,
                    borderWidth: 1,
                    borderColor: THEME.colors.border,
                    borderRadius: THEME.radius.md,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    color: THEME.colors.text,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                />
              </View>

              <View>
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 12,
                    fontWeight: "700",
                    marginBottom: 6,
                  }}
                >
                  END DATE (YYYY-MM-DD)
                </Text>
                <TextInput
                  value={customEnd}
                  onChangeText={setCustomEnd}
                  placeholder="2026-09-12"
                  placeholderTextColor={THEME.colors.textDisabled}
                  style={{
                    backgroundColor: THEME.colors.surface2,
                    borderWidth: 1,
                    borderColor: THEME.colors.border,
                    borderRadius: THEME.radius.md,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    color: THEME.colors.text,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                />
              </View>
            </View>

            {/* Modal Actions */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setCustomModalVisible(false)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: THEME.radius.md,
                  backgroundColor: THEME.colors.surface2,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontWeight: "700",
                    fontSize: 14,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={validateAndApplyCustomRange}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: THEME.radius.md,
                  backgroundColor: THEME.colors.primary,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontWeight: "800",
                    fontSize: 14,
                  }}
                >
                  Apply Range
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
