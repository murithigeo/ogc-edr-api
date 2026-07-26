export default function numberReturned(numberMatched: number, limit: number, offset: number) {
  let numberReturned = 0;
  const startIndex = Math.min(offset, numberMatched);
  const endIndex = Math.min(startIndex + limit, numberMatched);
  numberReturned += endIndex - startIndex;
  return numberReturned;
}
