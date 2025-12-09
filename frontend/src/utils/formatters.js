// Phone number formatting: (555)-419-2222
export const formatPhoneNumber = (value) => {
  if (!value) return '';
  
  // Remove all non-digits
  const phoneNumber = value.replace(/\D/g, '');
  
  // Format as (555)-419-2222
  if (phoneNumber.length <= 3) {
    return phoneNumber;
  } else if (phoneNumber.length <= 6) {
    return `(${phoneNumber.slice(0, 3)})-${phoneNumber.slice(3)}`;
  } else {
    return `(${phoneNumber.slice(0, 3)})-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  }
};

export const unformatPhoneNumber = (value) => {
  if (!value) return '';
  return value.replace(/\D/g, '');
};

// Currency formatting: 12.856,00 TL
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0,00';
  
  const number = parseFloat(value);
  if (isNaN(number)) return '0,00';
  
  // Format with Turkish locale: 12.856,00
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

// Currency with symbol: ₺12.856,00
export const formatCurrencyWithSymbol = (value) => {
  return `₺${formatCurrency(value)}`;
};
