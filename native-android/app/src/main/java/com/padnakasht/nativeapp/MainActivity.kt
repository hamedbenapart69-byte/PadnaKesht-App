package com.padnakasht.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.padnakasht.nativeapp.data.local.CustomerEntity
import com.padnakasht.nativeapp.data.local.LedgerEntryEntity
import com.padnakasht.nativeapp.data.local.ProductEntity
import com.padnakasht.nativeapp.ui.PadnaViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { Surface { PadnaHome() } } }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PadnaHome(vm: PadnaViewModel = viewModel()) {
    val customers by vm.customers.collectAsState()
    val products by vm.products.collectAsState()
    val entries by vm.entries.collectAsState()
    val net by vm.netCashFlow.collectAsState()
    val message by vm.message.collectAsState()
    var section by remember { mutableStateOf("خانه") }
    var dialog by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var unit by remember { mutableStateOf("عدد") }
    var price by remember { mutableStateOf("") }
    var stock by remember { mutableStateOf("0") }
    var amount by remember { mutableStateOf("") }
    var kind by remember { mutableStateOf("income") }
    var title by remember { mutableStateOf("") }

    Scaffold(topBar = { TopAppBar(title = { Text("پادناکِشت | مدیریت آفلاین") }) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("اطلاعات این نسخه به‌صورت محلی ذخیره می‌شود.", style = MaterialTheme.typography.bodyMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("خانه", "مشتریان", "کالاها", "تراکنش‌ها").forEach { label ->
                    Button(onClick = { section = label }) { Text(label) }
                }
            }
            if (section == "خانه") {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("نمای کلی", style = MaterialTheme.typography.titleLarge)
                        Text("مشتریان: ${customers.size}")
                        Text("کالاها: ${products.size}")
                        Text("تراکنش‌ها: ${entries.size}")
                        Text("خالص جریان ثبت‌شده: ${net} ریال")
                    }
                }
                Button(onClick = { section = "مشتریان" }) { Text("مدیریت مشتریان") }
                Button(onClick = { section = "کالاها" }) { Text("مدیریت کالاها") }
                Button(onClick = { section = "تراکنش‌ها" }) { Text("ثبت درآمد و هزینه") }
            } else if (section == "مشتریان") {
                Button(onClick = { name = ""; phone = ""; address = ""; dialog = "customer" }) { Text("افزودن مشتری") }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(customers, key = { it.id }) { CustomerRow(it) }
                }
            } else if (section == "کالاها") {
                Button(onClick = { name = ""; unit = "عدد"; price = ""; stock = "0"; dialog = "product" }) { Text("افزودن کالا") }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(products, key = { it.id }) { ProductRow(it) }
                }
            } else {
                Button(onClick = { title = ""; amount = ""; kind = "income"; dialog = "entry" }) { Text("ثبت تراکنش") }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(entries, key = { it.id }) { EntryRow(it) }
                }
            }
            message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        }
    }

    if (dialog.isNotEmpty()) {
        AlertDialog(
            onDismissRequest = { dialog = "" },
            title = { Text(when (dialog) { "customer" -> "مشتری جدید"; "product" -> "کالای جدید"; else -> "تراکنش جدید" }) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (dialog == "customer") {
                        OutlinedTextField(name, { name = it }, label = { Text("نام مشتری") })
                        OutlinedTextField(phone, { phone = it }, label = { Text("تلفن") })
                        OutlinedTextField(address, { address = it }, label = { Text("نشانی") })
                    } else if (dialog == "product") {
                        OutlinedTextField(name, { name = it }, label = { Text("نام کالا") })
                        OutlinedTextField(unit, { unit = it }, label = { Text("واحد") })
                        OutlinedTextField(price, { price = it }, label = { Text("قیمت (ریال)") })
                        OutlinedTextField(stock, { stock = it }, label = { Text("موجودی") })
                    } else {
                        OutlinedTextField(title, { title = it }, label = { Text("شرح") })
                        OutlinedTextField(amount, { amount = it }, label = { Text("مبلغ (ریال)") })
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { kind = "income" }) { Text("درآمد") }
                            Button(onClick = { kind = "expense" }) { Text("هزینه") }
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    when (dialog) {
                        "customer" -> vm.addCustomer(name, phone, address)
                        "product" -> vm.addProduct(name, unit, price, stock)
                        else -> vm.addEntry(title, amount, kind)
                    }
                    dialog = ""
                }) { Text("ذخیره") }
            },
            dismissButton = { TextButton(onClick = { dialog = "" }) { Text("انصراف") } }
        )
    }
}

@Composable private fun CustomerRow(item: CustomerEntity) {
    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) {
        Text(item.name, style = MaterialTheme.typography.titleMedium)
        if (item.phone.isNotBlank()) Text(item.phone)
        if (item.address.isNotBlank()) Text(item.address)
    } }
}
@Composable private fun ProductRow(item: ProductEntity) {
    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) {
        Text(item.name, style = MaterialTheme.typography.titleMedium)
        Text("قیمت: ${item.unitPriceRial} ریال | موجودی: ${item.stock} ${item.unit}")
    } }
}
@Composable private fun EntryRow(item: LedgerEntryEntity) {
    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) {
        Text(item.title, style = MaterialTheme.typography.titleMedium)
        Text("${if (item.kind == "income") "درآمد" else "هزینه"}: ${item.amountRial} ریال")
    } }
}
