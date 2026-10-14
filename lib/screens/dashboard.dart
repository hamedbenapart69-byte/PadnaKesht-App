import 'package:flutter/material.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('داشبورد پادناکِشت'),
        ),
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Card(
                child: ListTile(
                  title: const Text('فروش امروز'),
                  subtitle: const Text('۰ تومان'),
                ),
              ),
              Card(
                child: ListTile(
                  title: const Text('بدهی مشتریان'),
                  subtitle: const Text('۰ تومان'),
                ),
              ),
              Card(
                child: ListTile(
                  title: const Text('موجودی کالا'),
                  subtitle: const Text('۰ قلم'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
