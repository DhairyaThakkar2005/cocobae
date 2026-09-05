import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { THEME } from "../../theme/tokens";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  Category,
} from "../../db/categories";
import { Plus, Edit3, Trash2, Layers } from "../../lib/icons";
import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const GRADIENT_PRESETS = [
  { name: "Berry Sunset", from: "#FF6B6B", to: "#FFE66D" },
  { name: "Mint Glacier", from: "#4ECDC4", to: "#556270" },
  { name: "Caramel Honey", from: "#F7971E", to: "#FFD200" },
  { name: "Lavish Berry", from: "#A18CD1", to: "#FBC2EB" },
  { name: "Dark Cocoa", from: "#8B4513", to: "#D2691E" },
  { name: "Peach Cobbler", from: "#F3904F", to: "#3B4371" },
  { name: "Emerald Velvet", from: "#134E5E", to: "#71B280" },
  { name: "Royal Gold", from: "#F5A623", to: "#E8836A" },
];

export const CategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmoji, setFormEmoji] = useState("🍨");
  const [selectedGradIndex, setSelectedGradIndex] = useState(0);

  const loadData = async () => {
    const cats = await getCategories();
    setCategories(cats);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName("");
    setFormEmoji("🍨");
    setSelectedGradIndex(0);
    setModalVisible(true);
  };

  const handleOpenEdit = (c: Category) => {
    setEditingCategory(c);
    setFormName(c.name);
    setFormEmoji(c.emoji);
    const foundIdx = GRADIENT_PRESETS.findIndex(
      (g) => g.from === c.grad_from && g.to === c.grad_to,
    );
    setSelectedGradIndex(foundIdx >= 0 ? foundIdx : 0);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert("Validation Error", "Category name is required.");
      return;
    }

    const preset = GRADIENT_PRESETS[selectedGradIndex];
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formName.trim(),
          emoji: formEmoji.trim() || "🍨",
          grad_from: preset.from,
          grad_to: preset.to,
        });
      } else {
        await addCategory({
          name: formName.trim(),
          emoji: formEmoji.trim() || "🍨",
          grad_from: preset.from,
          grad_to: preset.to,
          sort_order: categories.length + 1,
        });
      }
      setModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save category.");
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      "Delete Category",
      `Delete "${name}"? Products inside this category will remain.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCategory(id);
            loadData();
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.bg, padding: 14 }}>
      {/* Header Bar */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Text
          style={{ color: THEME.colors.text, fontSize: 18, fontWeight: "800" }}
        >
          Menu Categories ({categories.length})
        </Text>
        <Button
          onPress={handleOpenAdd}
          size="sm"
          icon={<Plus size={16} color={THEME.colors.textInverse} />}
        >
          Add Category
        </Button>
      </View>

      {/* Category List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {categories.map((c) => (
          <View
            key={c.id}
            style={{
              backgroundColor: THEME.colors.surface,
              borderRadius: THEME.radius.lg,
              borderWidth: 1,
              borderColor: THEME.colors.border,
              padding: 12,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                flex: 1,
              }}
            >
              {/* Gradient Preview Pill */}
              <LinearGradient
                colors={[c.grad_from || "#FF6B6B", c.grad_to || "#FFE66D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: THEME.radius.md,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
              </LinearGradient>

              <View>
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  {c.name}
                </Text>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>
                  Sort Order: #{c.sort_order}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleOpenEdit(c)}
                style={{
                  backgroundColor: THEME.colors.surface2,
                  padding: 8,
                  borderRadius: THEME.radius.md,
                }}
              >
                <Edit3 size={16} color={THEME.colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDelete(c.id, c.name)}
                style={{
                  backgroundColor: "rgba(232, 93, 93, 0.1)",
                  padding: 8,
                  borderRadius: THEME.radius.md,
                }}
              >
                <Trash2 size={16} color={THEME.colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add / Edit Dialog */}
      <Dialog
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingCategory ? "Edit Category" : "New Category"}
      >
        <Input
          label="Category Name"
          value={formName}
          onChangeText={setFormName}
          placeholder="e.g. Artisanal Tarts"
        />

        <Input
          label="Emoji Icon"
          value={formEmoji}
          onChangeText={setFormEmoji}
          placeholder="🍨"
        />

        {/* Gradient Palette Selection */}
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 13,
            fontWeight: "500",
            marginBottom: 8,
          }}
        >
          Visual Card Gradient
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {GRADIENT_PRESETS.map((preset, idx) => {
            const isSelected = selectedGradIndex === idx;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedGradIndex(idx)}
                style={{
                  width: "47%",
                  borderRadius: THEME.radius.md,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected
                    ? THEME.colors.primary
                    : THEME.colors.border,
                  overflow: "hidden",
                }}
              >
                <LinearGradient
                  colors={[preset.from, preset.to]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFF",
                      fontWeight: "700",
                      fontSize: 11,
                      textShadowColor: "rgba(0,0,0,0.5)",
                      textShadowRadius: 3,
                    }}
                  >
                    {preset.name}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button onPress={handleSave} size="lg">
          {editingCategory ? "Save Changes" : "Create Category"}
        </Button>
      </Dialog>
    </View>
  );
};
