// Currency conversion rates (base: USD)
const exchangeRates = {
	USD: 1.0,
	EUR: 0.92,
	GBP: 0.79,
	JPY: 149.50,
	CAD: 1.36,
	AUD: 1.53,
	CHF: 0.88,
	CNY: 7.24,
	INR: 83.12,
	MXN: 17.08
};

/**
 * Convert an amount from one currency to another
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Source currency code (e.g., 'USD')
 * @param {string} toCurrency - Target currency code (e.g., 'EUR')
 * @returns {number} The converted amount
 */
export function convertCurrency(amount, fromCurrency, toCurrency) {
	if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
		throw new Error(`Invalid currency code: ${fromCurrency} or ${toCurrency}`);
	}

	// Convert to USD first, then to target currency
	const amountInUSD = amount / exchangeRates[fromCurrency];
	const convertedAmount = amountInUSD * exchangeRates[toCurrency];

	return convertedAmount;
}

/**
 * Get all supported currencies
 * @returns {string[]} Array of currency codes
 */
export function getSupportedCurrencies() {
	return Object.keys(exchangeRates);
}

/**
 * Get exchange rate between two currencies
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} The exchange rate
 */
export function getExchangeRate(fromCurrency, toCurrency) {
	if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
		throw new Error(`Invalid currency code: ${fromCurrency} or ${toCurrency}`);
	}

	return exchangeRates[toCurrency] / exchangeRates[fromCurrency];
}

export default {
	convertCurrency,
	getSupportedCurrencies,
	getExchangeRate
};
