class CalculationError extends Error {
  constructor(message, statusCode, meta) {
    super(message);
    this.name = 'CalculationError';
    this.statusCode = statusCode;
    this.meta = meta;
  }
}

// Export class CalculationError
module.exports = CalculationError;
