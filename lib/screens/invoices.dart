import 'package:flutter/material.dart';

class InvoicesPage extends StatelessWidget {
  const InvoicesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('فاکتور فروش'),
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            Card(
              child: ListTile(
                title: Text('ایجاد فاکتور جدید'),
                subtitle: Text('انتخاب مشتری، افزودن چند محصول و محاسبه مبلغ'),
              ),
            ),
            Card(
              child: ListTile(
                title: Text('پرداخت و بدهی'),
                subtitle: Text('ثبت مبلغ دریافتی و مانده حساب مشتری'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
