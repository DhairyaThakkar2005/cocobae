import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { THEME } from "../theme/tokens";
import { Order } from "../db/orders";
import { BillReceipt } from "../components/BillReceipt";
import { getAllSettings } from "../db/settings";

export interface BillScreenProps {
  order: Order;
  onNewOrder: () => void;
}

export const BillScreen: React.FC<BillScreenProps> = ({
  order,
  onNewOrder,
}) => {
  const [cafeName, setCafeName] = useState("CocoBae Dessert Café");
  const [upiId, setUpiId] = useState("cocobae@upi");

  useEffect(() => {
    (async () => {
      const settings = await getAllSettings();
      if (settings.cafe_name) setCafeName(settings.cafe_name);
      if (settings.upi_id) setUpiId(settings.upi_id);
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.bg }}>
      <BillReceipt
        order={order}
        cafeName={cafeName}
        upiId={upiId}
        onNewOrder={onNewOrder}
      />
    </View>
  );
};
