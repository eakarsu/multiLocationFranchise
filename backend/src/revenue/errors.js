class DomainError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
  }
}

function errorResponse(error) {
  if (error instanceof DomainError) {
    return { status: error.status, body: { error: error.message, code: error.code } };
  }
  if (error?.code === 'P2002') {
    return {
      status: 409,
      body: { error: 'The operation has already been submitted', code: 'DUPLICATE_OPERATION' },
    };
  }
  if (error?.code === 'P2025') {
    return { status: 404, body: { error: 'Record not found', code: 'NOT_FOUND' } };
  }
  if (error?.type === 'entity.parse.failed') {
    return { status: 400, body: { error: 'Request body is invalid JSON', code: 'INVALID_JSON' } };
  }
  if (error?.type === 'entity.too.large') {
    return { status: 413, body: { error: 'Request body is too large', code: 'PAYLOAD_TOO_LARGE' } };
  }
  return { status: 500, body: { error: 'Unexpected server error', code: 'INTERNAL_ERROR' } };
}

module.exports = { DomainError, errorResponse };
