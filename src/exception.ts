import { type HandleErrorFunction, HttpError, ValidationError } from 'exegesis';

/**
 * Convert exegesis Error classes into OGC API Exceptions
 */
export const handleErrorFunction: HandleErrorFunction = (err) => {
  console.error(err);
  let status = 500;
  let description = 'Internal Server Error';
  if (err instanceof ValidationError) {
    status = 400;
    description = '';
    for (let i = 0; i < err.errors.length; i++) {
      let error = err.errors[i];
      if (!error.location) continue;
      if (error.location.name) description += `${i}: ${error.location.name} `;
      if (error.location.in) description += ` in ${error.location.in} `;
      if (error.message) description += `with message '${error.message}'`;
    }
  } else if (err instanceof HttpError) {
    status = err.status;
    description = err.message;
  }
  return {
    status,
    headers: {
      'content-type': 'application/json',
    },
    statusText: description,
    body: JSON.stringify({
      code: status.toString(),
      description,
    }),
  };
};
