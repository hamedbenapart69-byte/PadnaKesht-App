package com.padnakasht.nativeapp.domain

data class NewCustomer(val name: String, val phone: String = "", val address: String = "")
data class NewProduct(val name: String, val unit: String, val unitPriceRial: Long, val stock: Long)
data class NewLedgerEntry(val title: String, val amountRial: Long, val kind: String)

object BusinessRules {
    fun customer(input: NewCustomer): NewCustomer {
        val name = input.name.trim().replace(Regex("\\s+"), " ")
        require(name.isNotEmpty()) { "نام مشتری الزامی است." }
        val phone = input.phone.trim()
        require(phone.isEmpty() || phone.matches(Regex("[+0-9۰-۹٠-٩()\\-\\s]{7,20}"))) {
            "شماره تماس معتبر نیست."
        }
        return input.copy(name = name, phone = phone, address = input.address.trim())
    }

    fun product(input: NewProduct): NewProduct {
        val name = input.name.trim()
        require(name.isNotEmpty()) { "نام کالا الزامی است." }
        require(input.unitPriceRial >= 0) { "قیمت نمی‌تواند منفی باشد." }
        require(input.stock >= 0) { "موجودی نمی‌تواند منفی باشد." }
        return input.copy(name = name, unit = input.unit.trim().ifEmpty { "عدد" })
    }

    fun ledger(input: NewLedgerEntry): NewLedgerEntry {
        require(input.title.isNotBlank()) { "شرح تراکنش الزامی است." }
        require(input.amountRial > 0) { "مبلغ باید بزرگ‌تر از صفر باشد." }
        require(input.kind == "income" || input.kind == "expense") { "نوع تراکنش نامعتبر است." }
        return input.copy(title = input.title.trim())
    }
}
