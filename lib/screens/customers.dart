import 'package:flutter/material.dart';

class CustomersPage extends StatelessWidget {
  const CustomersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('مشتریان'),
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            Card(
              child: ListTile(
                title: Text('مشتری جدید'),
                subtitle: Text('نام، شماره تماس، آدرس و حساب مشتری'),
              ),
            ),
            Card(
              child: ListTile(
                title: Text('سوابق خرید'),
                subtitle: Text('نمایش فاکتورها و بدهی‌ها'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
