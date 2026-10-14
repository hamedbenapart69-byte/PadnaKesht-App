import 'package:flutter/material.dart';
import 'screens/dashboard.dart';
import 'screens/customers.dart';
import 'screens/products.dart';
import 'screens/invoices.dart';

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
      theme: ThemeData(
        primarySwatch: Colors.green,
      ),
      home: const MainMenu(),
    );
  }
}

class MainMenu extends StatelessWidget {
  const MainMenu({super.key});

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('پادناکِشت'),
        ),
        drawer: Drawer(
          child: ListView(
            children: [
              const DrawerHeader(
                child: Text(
                  'مدیریت پادناکِشت',
                  style: TextStyle(fontSize: 22),
                ),
              ),
              ListTile(
                title: const Text('داشبورد'),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const DashboardPage(),
                    ),
                  );
                },
              ),
              ListTile(
                title: const Text('مشتریان'),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const CustomersPage(),
                    ),
                  );
                },
              ),
              ListTile(
                title: const Text('محصولات'),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const ProductsPage(),
                    ),
                  );
                },
              ),
              ListTile(
                title: const Text('فاکتورها'),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const InvoicesPage(),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
        body: const Center(
          child: Text(
            'نرم افزار حسابداری و مدیریت فروش پادناکِشت',
            style: TextStyle(fontSize: 20),
          ),
        ),
      ),
    );
  }
}
