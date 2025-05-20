class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something Went Wrong",
    errors = [],
    errorCode = "UNKNOWN_ERROR",
    stack = ""
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.success = false;
    this.errors = errors;
    this.errorCode = errorCode;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
