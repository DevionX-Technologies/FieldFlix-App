export type InvoiceInput = {
  title: string;
  amountInr: number;
  status: string;
  paidAtLabel: string;
  venueName: string;
  venueArea: string;
  serviceLines: string[];
  paymentMethod: string;
  orderId: string;
  paymentId: string;
  recordingFeeInr: number;
  gstInr: number;
};

export function buildPaymentInvoiceText(i: InvoiceInput): string {
  const lines = [
    'FieldFlicks — Payment receipt',
    '',
    i.title,
    `Amount: ₹${Math.round(i.amountInr)}`,
    `Status: ${i.status}`,
    `Date: ${i.paidAtLabel}`,
    '',
    'Venue Information',
    i.venueName,
    i.venueArea,
    '',
    'Service Details',
    ...i.serviceLines.map((l) => `• ${l}`),
    '',
    'Payment Details',
    `Payment Method: ${i.paymentMethod}`,
    `Order ID: ${i.orderId}`,
    `Transaction ID: ${i.paymentId}`,
    `Status: ${i.status}`,
    '',
    'Price Breakdown',
    `Recording fee: ₹${Math.round(i.recordingFeeInr)}`,
    `GST: ₹${Math.round(i.gstInr)}`,
    `Total: ₹${Math.round(i.amountInr)}`,
    '',
    '— End of receipt —',
  ];
  return lines.join('\n');
}
