export class DomainError extends Error {
  constructor(code, message, extensions = {}) {
    super(`${code}: ${message}`);
    this.name = 'DomainError';
    this.code = code;
    this.extensions = extensions;
  }
}

export function assertPositiveInteger(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainError('VALIDATION_ERROR', `${field} deve ser um int positivo`);
  }
}

export function assertNonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new DomainError('VALIDATION_ERROR', `${field} deve ser um int maior ou igual a zero`);
  }
}

export function normalizeMoney(value, field) {
  if (value === null || value === undefined || value === '') {
    throw new DomainError('VALIDATION_ERROR', `${field} é obrigatório`);
  }

  const normalized = String(value).replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new DomainError('VALIDATION_ERROR', `${field} deve ter formato  válido`);
  }

  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0 || number > 99999999.99) {
    throw new DomainError('VALIDATION_ERROR', `${field} deve estar entre 0 e 99999999.99`);
  }

  return number.toFixed(2);
}
