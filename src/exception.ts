import { type HandleErrorFunction, HttpError, ValidationError } from 'exegesis';

interface Exception {
  code: number;
  description: string;
  [x: string]: unknown;
}
/**
 * Convert exegesis Error classes into OGC API Exceptions
 */
export const handleErrorFunction: HandleErrorFunction = (err) => {
  console.error(err);

  const exception: Exception = { code: 500, description: 'Internal Server Error' };
  if (err instanceof ValidationError) {
    ({ message: exception.description, status: exception.code } = err);
  } else if (err instanceof HttpError) {
    ({ status: exception.code, message: exception.description } = err);
  }
  // If error is 500, dont set status code else set
  return {
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ...exception, code: exception.code.toString() }),
  };
};
