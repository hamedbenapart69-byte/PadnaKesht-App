package com.padnakasht.nativeapp.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class BusinessRulesTest {
    @Test fun trimsAndNormalizesCustomerName() {
        assertEquals("علی رضایی", BusinessRules.customer(NewCustomer("  علی   رضایی ")).name)
    }
    @Test fun rejectsBlankCustomerName() {
        assertThrows(IllegalArgumentException::class.java) { BusinessRules.customer(NewCustomer(" ")) }
    }
    @Test fun rejectsNegativeStockAndPrice() {
        assertThrows(IllegalArgumentException::class.java) { BusinessRules.product(NewProduct("کود", "کیلو", -1, 1)) }
        assertThrows(IllegalArgumentException::class.java) { BusinessRules.product(NewProduct("کود", "کیلو", 1, -1)) }
    }
    @Test fun ledgerUsesPositiveIntegerRialsAndKnownKinds() {
        assertThrows(IllegalArgumentException::class.java) { BusinessRules.ledger(NewLedgerEntry("فروش", 0, "income")) }
        assertThrows(IllegalArgumentException::class.java) { BusinessRules.ledger(NewLedgerEntry("فروش", 100, "unknown")) }
        assertEquals(100L, BusinessRules.ledger(NewLedgerEntry(" فروش ", 100, "income")).amountRial)
    }
}
