import 'package:flutter/material.dart';
import '../database/database_helper.dart';

class CustomersPage extends StatefulWidget { const CustomersPage({super.key}); @override State<CustomersPage> createState()=>_CustomersPageState(); }
class _CustomersPageState extends State<CustomersPage>{
 List<Map<String,dynamic>> customers=[];
 @override void initState(){super.initState();load();}
 Future<void> load() async { customers=await DatabaseHelper.instance.getCustomers(); setState((){}); }
 Future<void> add() async { final c=TextEditingController(); await showDialog(context:context,builder:(_)=>AlertDialog(title:const Text('مشتری جدید'),content:TextField(controller:c,decoration:const InputDecoration(labelText:'نام مشتری')),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('لغو')),ElevatedButton(onPressed:()async{if(c.text.trim().isEmpty)return;await DatabaseHelper.instance.insertCustomer({'name':c.text.trim(),'phone':'','address':'','note':'','createdAt':DateTime.now().toIso8601String()});if(mounted)Navigator.pop(context);load();},child:const Text('ذخیره'))])); }
 @override Widget build(BuildContext context)=>Directionality(textDirection:TextDirection.rtl,child:Scaffold(appBar:AppBar(title:const Text('مشتریان')),floatingActionButton:FloatingActionButton(onPressed:add,child:const Icon(Icons.add)),body:ListView.builder(itemCount:customers.length,itemBuilder:(_,i)=>ListTile(title:Text(customers[i]['name'])))));
}
