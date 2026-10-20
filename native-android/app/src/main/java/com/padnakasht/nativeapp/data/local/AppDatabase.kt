package com.padnakasht.nativeapp.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

@Dao
interface CustomerDao {
    @Query("SELECT * FROM customers ORDER BY name COLLATE NOCASE")
    fun observeAll(): Flow<List<CustomerEntity>>
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(customer: CustomerEntity): Long
    @Query("SELECT COUNT(*) FROM customers WHERE lower(trim(name)) = lower(trim(:name))")
    suspend fun countName(name: String): Int
}

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name COLLATE NOCASE")
    fun observeAll(): Flow<List<ProductEntity>>
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(product: ProductEntity): Long
}

@Dao
interface LedgerDao {
    @Query("SELECT * FROM ledger_entries ORDER BY occurredAt DESC, id DESC")
    fun observeAll(): Flow<List<LedgerEntryEntity>>
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(entry: LedgerEntryEntity): Long
    @Query("SELECT COALESCE(SUM(CASE WHEN kind = 'income' THEN amountRial ELSE -amountRial END), 0) FROM ledger_entries")
    fun observeNetCashFlow(): Flow<Long>
}

@Database(
    entities = [CustomerEntity::class, ProductEntity::class, LedgerEntryEntity::class],
    version = 1,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun customers(): CustomerDao
    abstract fun products(): ProductDao
    abstract fun ledger(): LedgerDao
}
