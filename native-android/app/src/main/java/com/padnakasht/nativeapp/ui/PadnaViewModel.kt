package com.padnakasht.nativeapp.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.room.Room
import com.padnakasht.nativeapp.data.PadnaRepository
import com.padnakasht.nativeapp.data.local.AppDatabase
import com.padnakasht.nativeapp.domain.NewCustomer
import com.padnakasht.nativeapp.domain.NewLedgerEntry
import com.padnakasht.nativeapp.domain.NewProduct
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class PadnaViewModel(application: Application) : AndroidViewModel(application) {
    private val db = Room.databaseBuilder(application, AppDatabase::class.java, "padnakesht-native.db").build()
    private val repository = PadnaRepository(db)
    val customers = repository.customers.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val products = repository.products.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val entries = repository.entries.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val netCashFlow = repository.netCashFlow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0L)
    val message = kotlinx.coroutines.flow.MutableStateFlow<String?>(null)

    fun addCustomer(name: String, phone: String, address: String) = runAction {
        repository.addCustomer(NewCustomer(name, phone, address)); "مشتری ذخیره شد."
    }
    fun addProduct(name: String, unit: String, price: String, stock: String) = runAction {
        val amount = price.toLongOrNull() ?: error("قیمت باید عدد صحیح ریال باشد.")
        val quantity = stock.toLongOrNull() ?: error("موجودی باید عدد صحیح باشد.")
        repository.addProduct(NewProduct(name, unit, amount, quantity)); "کالا ذخیره شد."
    }
    fun addEntry(title: String, amount: String, kind: String) = runAction {
        val rial = amount.toLongOrNull() ?: error("مبلغ باید عدد صحیح ریال باشد.")
        repository.addLedgerEntry(NewLedgerEntry(title, rial, kind)); "تراکنش ذخیره شد."
    }
    private fun runAction(block: suspend () -> String) = viewModelScope.launch {
        message.value = try { block() } catch (e: Exception) { e.message ?: "عملیات انجام نشد." }
    }
    override fun onCleared() { db.close(); super.onCleared() }
}
