export type Order = {
  id: number;
  order_number: string;
  status: string;
  total_amount: string;
  currency: string;
  placed_at: string;
  delivery_window_label: string | null;
  delivery_address_snapshot: string;
  buyer_name_snapshot: string;
  buyer_phone_snapshot: string;
};

export type OrderDetail = Order & {
  items: {
    id: number;
    product_name_snapshot: string;
    selling_unit_snapshot: string;
    quantity: string;
    line_total: string;
  }[];
  history: { status: string; note: string | null; created_at: string }[];
};

export function orderStatusLabel(status: string): string {
  return status.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

const vendorTransitions: Readonly<Record<string, string>> = {
  new: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'out_for_delivery',
  out_for_delivery: 'delivered',
};

export function nextVendorOrderStatus(status: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(vendorTransitions, status) ? vendorTransitions[status] : undefined;
}
