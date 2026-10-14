import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._();
  DatabaseHelper._();
  Database? _db;

  Future<Database> get database async {
    _db ??= await _init();
    return _db!;
  }

  Future<Database> _init() async {
    final dbPath = join(await getDatabasesPath(), 'padnakesht.db');
    return openDatabase(dbPath, version: 1, onCreate: (db, _) async {
      await db.execute('''CREATE TABLE customers(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      note TEXT,
      createdAt TEXT NOT NULL)''');
    });
  }

  Future<int> insertCustomer(Map<String,dynamic> data) async => (await database).insert('customers', data);
  Future<List<Map<String,dynamic>>> getCustomers() async => (await database).query('customers', orderBy:'id DESC');
}
