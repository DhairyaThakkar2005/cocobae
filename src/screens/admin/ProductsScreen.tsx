import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { THEME } from "../../theme/tokens";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
  Product,
} from "../../db/products";
import { getCategories, Category } from "../../db/categories";
import { formatINR } from "../../lib/utils";
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Cake,
  CheckCircle2,
  Camera,
  ImageIcon,
  X,
} from "../../lib/icons";
import { resolveProductImageUri, toRelativeImagePath } from "../../lib/imageUtils";
import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export const ProductsScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<number>(0);

  // Form modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("0");
  const [formCategoryId, setFormCategoryId] = useState<number>(1);
  const [formIsVeg, setFormIsVeg] = useState(1);
  const [formImagePath, setFormImagePath] = useState("");

  const loadData = async () => {
    const [cats, prods] = await Promise.all([
      getCategories(),
      getProducts(selectedCategoryFilter, search),
    ]);
    setCategories(cats);
    setProducts(prods);
  };

  useEffect(() => {
    loadData();
  }, [selectedCategoryFilter, search]);

  const ensureImageDir = async () => {
    const docDir = (FileSystem as any).documentDirectory || "";
    const imgDir = `${docDir}product_images/`;
    const info = await FileSystem.getInfoAsync(imgDir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(imgDir, { intermediates: true });
    }
    return imgDir;
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow gallery access to select a dessert photo.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const imgDir = await ensureImageDir();
        const ext = result.assets[0].uri.split(".").pop() || "jpg";
        const newFileName = `prod_${Date.now()}.${ext}`;
        const destUri = `${imgDir}${newFileName}`;
        await FileSystem.copyAsync({
          from: result.assets[0].uri,
          to: destUri,
        });
        setFormImagePath(toRelativeImagePath(destUri));
      }
    } catch (err: any) {
      Alert.alert("Image Error", err.message || "Could not pick image.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow camera access to take a dessert photo.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const imgDir = await ensureImageDir();
        const ext = result.assets[0].uri.split(".").pop() || "jpg";
        const newFileName = `prod_${Date.now()}.${ext}`;
        const destUri = `${imgDir}${newFileName}`;
        await FileSystem.copyAsync({
          from: result.assets[0].uri,
          to: destUri,
        });
        setFormImagePath(toRelativeImagePath(destUri));
      }
    } catch (err: any) {
      Alert.alert("Camera Error", err.message || "Could not take photo.");
    }
  };

  const handleSelectImageSource = () => {
    Alert.alert("Dessert Photo", "Choose an option to add dessert photo:", [
      { text: "Take Photo (Camera)", onPress: handleTakePhoto },
      { text: "Choose from Gallery", onPress: handlePickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName("");
    setFormDesc("");
    setFormPrice("");
    setFormStock("0");
    setFormCategoryId(categories[0]?.id || 1);
    setFormIsVeg(1);
    setFormImagePath("");
    setModalVisible(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormDesc(p.description || "");
    setFormPrice(p.price.toString());
    setFormStock((p.stock_quantity ?? 0).toString());
    setFormCategoryId(p.category_id);
    setFormIsVeg(p.is_veg);
    setFormImagePath(p.image_path || "");
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPrice.trim()) {
      Alert.alert("Validation Error", "Product name and price are required.");
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Validation Error", "Please enter a valid price.");
      return;
    }

    const stockNum = parseInt(formStock, 10);
    const validStock = isNaN(stockNum) || stockNum < 0 ? 0 : stockNum;

    try {
      const relativePath = formImagePath.trim()
        ? toRelativeImagePath(formImagePath.trim())
        : null;

      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formName.trim(),
          description: formDesc.trim(),
          price: priceNum,
          category_id: formCategoryId,
          is_veg: formIsVeg,
          is_available: editingProduct.is_available,
          image_path: relativePath,
          stock_quantity: validStock,
        });
      } else {
        await addProduct({
          name: formName.trim(),
          description: formDesc.trim(),
          price: priceNum,
          category_id: formCategoryId,
          is_veg: formIsVeg,
          is_available: 1,
          image_path: relativePath,
          stock_quantity: validStock,
        });
      }
      setModalVisible(false);
      loadData();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save product.");
    }
  };


  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteProduct(id);
            loadData();
          },
        },
      ],
    );
  };

  const handleToggle = async (id: number, current: number) => {
    await toggleProductAvailability(id, current);
    loadData();
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.bg, padding: 14 }}>
      {/* Top Action Bar */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text
          style={{ color: THEME.colors.text, fontSize: 18, fontWeight: "800" }}
        >
          Dessert Menu Items ({products.length})
        </Text>
        <Button
          onPress={handleOpenAdd}
          size="sm"
          icon={<Plus size={16} color={THEME.colors.textInverse} />}
        >
          Add Dessert
        </Button>
      </View>

      {/* Search Bar */}
      <View
        style={{
          backgroundColor: THEME.colors.surface,
          borderRadius: THEME.radius.md,
          borderColor: THEME.colors.border,
          borderWidth: 1,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          marginBottom: 12,
          height: 38,
        }}
      >
        <Search
          size={16}
          color={THEME.colors.textMuted}
          style={{ marginRight: 6 }}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Filter menu items..."
          placeholderTextColor={THEME.colors.textDisabled}
          style={{ flex: 1, color: THEME.colors.text, fontSize: 13 }}
        />
      </View>

      {/* Product List Table / Cards */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {products.map((p) => (
          <View
            key={p.id}
            style={{
              backgroundColor: THEME.colors.surface,
              borderRadius: THEME.radius.lg,
              borderWidth: 1,
              borderColor: THEME.colors.border,
              padding: 12,
              marginBottom: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Product Thumbnail */}
            {resolveProductImageUri(p.image_path) ? (
              <Image
                source={{ uri: resolveProductImageUri(p.image_path)! }}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: THEME.radius.md,
                  marginRight: 12,
                  backgroundColor: THEME.colors.surface2,
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: THEME.radius.md,
                  marginRight: 12,
                  backgroundColor: THEME.colors.surface2,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Cake size={22} color={THEME.colors.primary} />
              </View>
            )}

            <View style={{ flex: 1, marginRight: 12 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: p.is_veg
                      ? THEME.colors.success
                      : THEME.colors.nonveg,
                  }}
                />
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  {p.name}
                </Text>
              </View>

              <Text
                numberOfLines={1}
                style={{
                  color: THEME.colors.textMuted,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {p.category_name} • {p.description || "No description"}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 6,
                }}
              >
                <Text
                  style={{
                    color: THEME.colors.primary,
                    fontSize: 14,
                    fontWeight: "800",
                  }}
                >
                  {formatINR(p.price)}
                </Text>

                {/* Stock Status Badge */}
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: THEME.radius.sm,
                    backgroundColor:
                      (p.stock_quantity ?? 0) <= 0
                        ? "rgba(239, 68, 68, 0.12)"
                        : (p.stock_quantity ?? 0) < 5
                          ? "rgba(245, 158, 11, 0.12)"
                          : THEME.colors.surface2,
                    borderWidth: 1,
                    borderColor:
                      (p.stock_quantity ?? 0) <= 0
                        ? THEME.colors.danger
                        : (p.stock_quantity ?? 0) < 5
                          ? "#F59E0B"
                          : THEME.colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color:
                        (p.stock_quantity ?? 0) <= 0
                          ? THEME.colors.danger
                          : (p.stock_quantity ?? 0) < 5
                            ? "#F59E0B"
                            : THEME.colors.textMuted,
                    }}
                  >
                    {(p.stock_quantity ?? 0) <= 0
                      ? "Out of Stock"
                      : `Stock: ${p.stock_quantity} units`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions (Toggle in stock, Edit, Delete) */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {/* Availability Switch */}
              <View style={{ alignItems: "center" }}>
                <Switch
                  value={p.is_available === 1}
                  onValueChange={() => handleToggle(p.id, p.is_available)}
                  trackColor={{
                    false: THEME.colors.surface2,
                    true: THEME.colors.primaryGlow,
                  }}
                  thumbColor={
                    p.is_available === 1
                      ? THEME.colors.primary
                      : THEME.colors.textDisabled
                  }
                />
                <Text
                  style={{
                    color:
                      p.is_available === 1
                        ? THEME.colors.success
                        : THEME.colors.textDisabled,
                    fontSize: 9,
                    fontWeight: "700",
                  }}
                >
                  {p.is_available === 1 ? "ACTIVE" : "OFF"}
                </Text>
              </View>

              {/* Edit */}
              <TouchableOpacity
                onPress={() => handleOpenEdit(p)}
                style={{
                  backgroundColor: THEME.colors.surface2,
                  padding: 8,
                  borderRadius: THEME.radius.md,
                }}
              >
                <Edit3 size={16} color={THEME.colors.primary} />
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                onPress={() => handleDelete(p.id, p.name)}
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

      {/* Add / Edit Product Dialog */}
      <Dialog
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingProduct ? "Edit Dessert" : "Add New Dessert"}
      >
        <Input
          label="Dessert Name"
          value={formName}
          onChangeText={setFormName}
          placeholder="e.g. Pistachio Milk Cake"
        />

        <Input
          label="Price (₹)"
          value={formPrice}
          onChangeText={setFormPrice}
          placeholder="250"
          keyboardType="numeric"
        />

        <Input
          label="Stock Quantity (Available Units)"
          value={formStock}
          onChangeText={setFormStock}
          placeholder="0"
          keyboardType="numeric"
        />
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 11,
            marginTop: -6,
            marginBottom: 12,
          }}
        >
          Stock updates here automatically sync with inventory & restock history logs.
        </Text>

        <Input
          label="Description"
          value={formDesc}
          onChangeText={setFormDesc}
          placeholder="Short description of ingredients..."
          multiline
          numberOfLines={2}
        />

        {/* Category Picker */}
        <Text
          style={{
            color: THEME.colors.textMuted,
            fontSize: 13,
            fontWeight: "500",
            marginBottom: 6,
          }}
        >
          Category
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 14 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setFormCategoryId(c.id)}
              style={{
                backgroundColor:
                  formCategoryId === c.id
                    ? THEME.colors.primary
                    : THEME.colors.surface2,
                borderRadius: THEME.radius.full,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  color:
                    formCategoryId === c.id
                      ? THEME.colors.textInverse
                      : THEME.colors.text,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {c.emoji} {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Product Image Picker */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              color: THEME.colors.textMuted,
              fontSize: 13,
              fontWeight: "500",
              marginBottom: 8,
            }}
          >
            Dessert Photo
          </Text>

          {formImagePath ? (
            /* Uploaded State: Full-width container, clickable to replace, small top-right ✕ */
            <View
              style={{
                width: "100%",
                height: 170,
                borderRadius: THEME.radius.lg,
                borderWidth: 1.5,
                borderColor: THEME.colors.primary,
                overflow: "hidden",
                position: "relative",
                backgroundColor: THEME.colors.surface2,
              }}
            >
              <TouchableOpacity
                onPress={handleSelectImageSource}
                activeOpacity={0.85}
                style={{ width: "100%", height: "100%" }}
              >
                <Image
                  source={{
                    uri: resolveProductImageUri(formImagePath) || formImagePath,
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  resizeMode="cover"
                />
                {/* Subtle overlay pill suggesting tap to change */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 10,
                    left: 10,
                    backgroundColor: "rgba(15, 10, 6, 0.75)",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: THEME.radius.full,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    borderWidth: 1,
                    borderColor: THEME.colors.border,
                  }}
                >
                  <Camera size={12} color={THEME.colors.primary} />
                  <Text style={{ color: THEME.colors.text, fontSize: 11, fontWeight: "600" }}>
                    Tap to Change
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Small ✕ delete icon on top-right */}
              <TouchableOpacity
                onPress={() => setFormImagePath("")}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  backgroundColor: "rgba(232, 93, 93, 0.9)",
                  borderRadius: 14,
                  width: 28,
                  height: 28,
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 3,
                  elevation: 4,
                }}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            /* Empty State: Full-width container inviting upload with Camera & Gallery options */
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={handleSelectImageSource}
                activeOpacity={0.8}
                style={{
                  width: "100%",
                  height: 130,
                  borderRadius: THEME.radius.lg,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: THEME.colors.borderStrong,
                  backgroundColor: THEME.colors.surface2,
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 16,
                }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: THEME.colors.primaryGlow,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <ImageIcon size={22} color={THEME.colors.primary} />
                </View>
                <Text
                  style={{
                    color: THEME.colors.text,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  Upload Dessert Photo
                </Text>
                <Text
                  style={{
                    color: THEME.colors.textMuted,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  Tap here or use buttons below
                </Text>
              </TouchableOpacity>

              {/* Camera / Gallery Quick Action Buttons (shown only in empty state) */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: THEME.colors.surface2,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: THEME.radius.md,
                    borderWidth: 1,
                    borderColor: THEME.colors.border,
                  }}
                >
                  <ImageIcon size={15} color={THEME.colors.primary} />
                  <Text
                    style={{
                      color: THEME.colors.text,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    Choose Gallery
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleTakePhoto}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: THEME.colors.surface2,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: THEME.radius.md,
                    borderWidth: 1,
                    borderColor: THEME.colors.border,
                  }}
                >
                  <Camera size={15} color={THEME.colors.primary} />
                  <Text
                    style={{
                      color: THEME.colors.text,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    Take Camera
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Veg Toggle */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              color: THEME.colors.text,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            Pure Vegetarian Item
          </Text>
          <Switch
            value={formIsVeg === 1}
            onValueChange={(val) => setFormIsVeg(val ? 1 : 0)}
            trackColor={{ false: "#444", true: THEME.colors.success }}
            thumbColor="#FFF"
          />
        </View>

        <Button onPress={handleSave} size="lg">
          {editingProduct ? "Update Dessert" : "Create Dessert"}
        </Button>
      </Dialog>
    </View>
  );
};
