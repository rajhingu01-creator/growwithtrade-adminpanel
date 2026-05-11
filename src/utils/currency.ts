export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 83.0 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rate: 5.0 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rate: 1.5 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 1.35 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 150.0 },
];

export const getCurrencySymbol = (code: string) => {
  return CURRENCIES.find(c => c.code === code)?.symbol || '$';
};

export const getMinTradeAmount = (currencyCode: string) => {
  const baseMinINR = 30;
  const inrRate = CURRENCIES.find(c => c.code === 'INR')?.rate || 83.0;
  const currentRate = CURRENCIES.find(c => c.code === currencyCode)?.rate || 1.0;
  
  // Convert 30 INR to USD first, then to current currency
  // (30 / 83) * currentRate
  return (baseMinINR / inrRate) * currentRate;
};

export const getMinDepositAmount = (currencyCode: string) => {
  const baseMinINR = 300;
  const inrRate = CURRENCIES.find(c => c.code === 'INR')?.rate || 83.0;
  const currentRate = CURRENCIES.find(c => c.code === currencyCode)?.rate || 1.0;
  return (baseMinINR / inrRate) * currentRate;
};

export const getMinWithdrawalAmount = (currencyCode: string) => {
  const baseMinINR = 600;
  const inrRate = CURRENCIES.find(c => c.code === 'INR')?.rate || 83.0;
  const currentRate = CURRENCIES.find(c => c.code === currencyCode)?.rate || 1.0;
  return (baseMinINR / inrRate) * currentRate;
};
