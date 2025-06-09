type ExtractUrlParams<T extends string> =
  T extends `${infer _Start}/{{${infer Param}}}${infer Rest}`
    ? { [K in Param | keyof ExtractUrlParams<Rest>]: string }
    : {};

export const makeUrlWithParams = <T extends string>(
  url: T,
  params: ExtractUrlParams<T>
) => {
  let finalUrl = url;
  Object.entries(params).map(([key, val]) => {
    const expr = new RegExp(`{{${key}}}`, "g");
    finalUrl = finalUrl.replace(expr, val as string) as T;
  });

  return finalUrl;
};
