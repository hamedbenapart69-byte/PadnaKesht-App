package com.padnakasht.nativeapp.data

import androidx.room.withTransaction
import com.padnakasht.nativeapp.data.local.AppDatabase
import com.padnakasht.nativeapp.data.local.CustomerEntity
import com.padnakasht.nativeapp.data.local.LedgerEntryEntity
import com.padnakasht.nativeapp.data.local.ProductEntity
import com.padnakasht.nativeapp.domain.BusinessRules
import com.padnakasht.nativeapp.domain.NewCustomer
import com.padnakasht.nativeapp.domain.NewLedgerEntry
import com.padnakasht.nativeapp.domain.NewProduct
import kotlinx.coroutines.flow.Flow

class PadnaRepository(private val db: AppDatabase) {
    val customers: Flow<List<CustomerEntity>> = db.customers().observeAll()
    val products: Flow<List<ProductEntity>> = db.products().observeAll()
    val entries: Flow<List<LedgerEntryEntity>> = db.ledger().observeAll()
    val netCashFlow: Flow<Long> = db.ledger().observeNetCashFlow()

    suspend fun addCustomer(input: NewCustomer) {
        val clean = BusinessRules.customer(input)
        db.withTransaction {
            require(db.customers().countName(clean.name) == 0) { "این مشتری قبلاً ثبت شده است." }
            db.customers().insert(CustomerEntity(name = clean.name, phone = clean.phone, address = clean.address))
        }
    }

    suspend fun addProduct(input: NewProduct) {
        val clean = BusinessRules.product(input)
        db.products().insert(ProductEntity(name = clean.name, unit = clean.unit, unitPriceRial = clean.unitPriceRial, stock = clean.stock))
    }

    suspend fun addLedgerEntry(input: NewLedgerEntry) {
        val clean = BusinessRules.ledger(input)
        db.ledger().insert(LedgerEntryEntity(title = clean.title, amountRial = clean.amountRial, kind = clean.kind))
    }
}
