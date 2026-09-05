import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { THEME } from "../../theme/tokens";
import { X } from "../../lib/icons";
import { useBreakpoint } from "../../theme/breakpoints";

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  const { isTablet, width } = useBreakpoint();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: THEME.colors.overlay,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                width: isTablet ? Math.min(560, width - 64) : "100%",
                maxHeight: "85%",
                backgroundColor: THEME.colors.surface,
                borderRadius: THEME.radius.xl,
                borderWidth: 1,
                borderColor: THEME.colors.border,
                padding: 20,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  {title}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    backgroundColor: THEME.colors.surface2,
                    padding: 6,
                    borderRadius: THEME.radius.full,
                  }}
                >
                  <X size={18} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {children}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
