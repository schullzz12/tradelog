// lib/validation.js
export function validateTrade(data) {
  const errors = [];

  if (!data.ticker || typeof data.ticker !== 'string' || data.ticker.trim().length === 0) {
    errors.push('Ticker saham wajib diisi');
  } else if (data.ticker.trim().length > 10) {
    errors.push('Ticker terlalu panjang (maks 10 karakter)');
  }

  if (!data.type || !['long', 'short'].includes(data.type)) {
    errors.push('Tipe harus long atau short');
  }

  if (data.entry_price == null || isNaN(data.entry_price)) {
    errors.push('Harga entry wajib diisi');
  } else if (data.entry_price <= 0) {
    errors.push('Harga entry harus lebih dari 0');
  } else if (data.entry_price > 100000000) {
    errors.push('Harga entry tidak valid');
  }

  if (data.exit_price != null && data.exit_price !== '' && data.exit_price !== 0) {
    if (isNaN(data.exit_price) || data.exit_price <= 0 || data.exit_price > 100000000) {
      errors.push('Harga exit tidak valid');
    }
  }

  if (data.shares == null || isNaN(data.shares)) {
    errors.push('Jumlah lembar wajib diisi');
  } else if (data.shares <= 0 || !Number.isInteger(data.shares) || data.shares > 100000000) {
    errors.push('Jumlah lembar tidak valid');
  }

  if (!data.entry_date) {
    errors.push('Tanggal entry wajib diisi');
  } else {
    const entryDate = new Date(data.entry_date);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    if (isNaN(entryDate.getTime()) || entryDate > now || entryDate < new Date('2000-01-01')) {
      errors.push('Tanggal entry tidak valid');
    }
  }

  if (data.exit_date) {
    const exitDate = new Date(data.exit_date);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    if (isNaN(exitDate.getTime()) || exitDate > now) {
      errors.push('Tanggal exit tidak valid');
    } else if (data.entry_date && exitDate < new Date(data.entry_date)) {
      errors.push('Tanggal exit harus setelah tanggal entry');
    }
  }

  if (data.notes && data.notes.length > 5000) {
    errors.push('Notes terlalu panjang (maks 5000 karakter)');
  }

  return { valid: errors.length === 0, errors };
}