// @ts-nocheck Third-party function
export function objectToQueryParams(obj: any, prefix: string = '') {
  const queryString = Object.entries(obj)
    .flatMap(([key, value]) => {
      const paramKey = prefix
        ? `${prefix}[${encodeURIComponent(key)}]`
        : encodeURIComponent(key);

      if (Array.isArray(value)) {
        return value
          .map((item: any, index: number) => {
            if (typeof item === 'object' && item !== null) {
              return objectToQueryParams(item, `${paramKey}[${index}]`);
            } else {
              return `${paramKey}[]=${encodeURIComponent(item)}`;
            }
          })
          .join('&');
      } else if (typeof value === 'object' && value !== null) {
        return objectToQueryParams(value, paramKey);
      } else {
        return `${paramKey}=${encodeURIComponent(value)}`;
      }
    })
    .join('&');

  return queryString;
}
