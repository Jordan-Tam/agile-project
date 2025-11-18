import * as chai from "chai";
import {
	convertCurrency,
	getSupportedCurrencies,
	getExchangeRate
} from "../data/currencyConverter.js";

const expect = chai.expect;

export async function runCurrencyConverterTests() {
	console.log("\n=== Running Currency Converter Tests ===\n");

	let passed = 0;
	let failed = 0;

	// Test 1: Convert USD to EUR
	try {
		const result = convertCurrency(100, "USD", "EUR");
		expect(result).to.be.a("number");
		expect(result).to.equal(92); // 100 * 0.92
		console.log("✓ Test 1 passed: USD to EUR conversion");
		passed++;
	} catch (error) {
		console.log("✗ Test 1 failed: USD to EUR conversion");
		console.log(`  Error: ${error.message}`);
		failed++;
	}

	// Test 2: Convert EUR to USD
	try {
		const result = convertCurrency(92, "EUR", "USD");
		expect(result).to.be.a("number");
		expect(result).to.be.closeTo(100, 0.01); // Should be close to 100
		console.log("✓ Test 2 passed: EUR to USD conversion");
		passed++;
	} catch (error) {
		console.log("✗ Test 2 failed: EUR to USD conversion");
		console.log(`  Error: ${error.message}`);
		failed++;
	}

	// Test 3: Convert same currency (USD to USD)
	try {
		const result = convertCurrency(100, "USD", "USD");
		expect(result).to.equal(100);
		console.log("✓ Test 3 passed: Same currency conversion");
		passed++;
	} catch (error) {
		console.log("✗ Test 3 failed: Same currency conversion");
		console.log(`  Error: ${error.message}`);
		failed++;
	}

	// Test 4: Convert GBP to JPY
	try {
		const result = convertCurrency(100, "GBP", "JPY");
		expect(result).to.be.a("number");
		// 100 GBP -> USD: 100/0.79 = 126.58 USD -> JPY: 126.58 * 149.50
		expect(result).to.be.closeTo(18924.05, 0.1);
		console.log("✓ Test 4 passed: GBP to JPY conversion");
		passed++;
	} catch (error) {
		console.log("✗ Test 4 failed: GBP to JPY conversion");
		console.log(`  Error: ${error.message}`);
		failed++;
	}

	// Test 5: Invalid source currency
	try {
		convertCurrency(100, "INVALID", "USD");
		console.log("✗ Test 5 failed: Should throw error for invalid source currency");
		failed++;
	} catch (error) {
		expect(error.message).to.include("Invalid currency code");
		console.log("✓ Test 5 passed: Invalid source currency throws error");
		passed++;
	}

	// Test 6: Invalid target currency
	try {
		convertCurrency(100, "USD", "INVALID");
		console.log("✗ Test 6 failed: Should throw error for invalid target currency");
		failed++;
	} catch (error) {
		expect(error.message).to.include("Invalid currency code");
		console.log("✓ Test 6 passed: Invalid target currency throws error");
		passed++;
	}

	// Test 7: Get supported currencies
	try {
		const currencies = getSupportedCurrencies();
		expect(currencies).to.be.an("array");
		expect(currencies).to.have.lengthOf(10);
		expect(currencies).to.include.members([
			"USD",
			"EUR",
			"GBP",
			"JPY",
			"CAD",
			"AUD",
			"CHF",
			"CNY",
			"INR",
			"MXN"
		]);
		console.log("✓ Test 7 passed: Get supported currencies");
		passed++;
	} catch (error) {
		console.log("✗ Test 7 failed: Get supported currencies");
		console.log(`  Error: ${error.message}`);
		failed++;
	}

	// Test 8: Get exchange rate
	try {
		const rate = getExchangeRate("USD", "EUR");
		expect(rate).to.be.a("number");
		expect(rate).to.equal(0.92);
		console.log("✓ Test 8 passed: Get exchange rate");
		passed++;
	} catch (error) {
		console.log("✗ Test 8 failed: Get exchange rate");
		console.log(`  Error: ${error.message}`);
		failed++;
	}

	// Test 9: Get exchange rate with invalid currency
	try {
		getExchangeRate("USD", "INVALID");
		console.log("✗ Test 9 failed: Should throw error for invalid currency in getExchangeRate");
		failed++;
	} catch (error) {
		expect(error.message).to.include("Invalid currency code");
		console.log("✓ Test 9 passed: Invalid currency in getExchangeRate throws error");
		passed++;
	}

	// Test 10: Convert zero amount
	try {
		const result = convertCurrency(0, "USD", "EUR");
		expect(result).to.equal(0);
		console.log("✓ Test 10 passed: Convert zero amount");
		passed++;
	} catch (error) {
		console.log("✗ Test 10 failed: Convert zero amount");
		console.log(`  Error: ${error.message}`);
		failed++;
	}

	console.log(
		`\nCurrency Converter Tests Complete: ${passed} passed, ${failed} failed`
	);
	return { total: passed + failed, passed, failed };
}
