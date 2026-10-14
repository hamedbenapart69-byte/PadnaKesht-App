import 'package:flutter/material.dart';

void main() {
  runApp(const PadnaKeshtApp());
}

class PadnaKeshtApp extends StatelessWidget {
  const PadnaKeshtApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'PadnaKesht',
      home: Directionality(
        textDirection: TextDirection.rtl,
        child: Scaffold(
          appBar: AppBar(
            title: const Text('پادناکِشت'),
          ),
          body: const Center(
            child: Text(
              'نرم افزار مدیریت فروش پادناکِشت',
              style: TextStyle(fontSize: 22),
            ),
          ),
        ),
      ),
    );
  }
}
