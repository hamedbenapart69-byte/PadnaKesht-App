class Invoice {
  final String customerName;
  final List<String> products;
  final double totalAmount;
  final double paidAmount;
  final DateTime date;

  Invoice({
    required this.customerName,
    required this.products,
    required this.totalAmount,
    required this.paidAmount,
    required this.date,
  });

  double get remainingDebt {
    return totalAmount - paidAmount;
  }
}
