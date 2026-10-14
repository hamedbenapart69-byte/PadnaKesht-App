import 'package:flutter/material.dart';

class ProductsPage extends StatelessWidget {
  const ProductsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('محصولات و انبار'),
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: const [
            Card(
              child: ListTile(
                title: Text('ثبت محصول جدید'),
                subtitle: Text('نام، دسته‌بندی، قیمت و موجودی'),
              ),
            ),
            Card(
              child: ListTile(
                title: Text('کنترل موجودی'),
                subtitle: Text('افزایش، کاهش و هشدار کمبود کالا'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
