/** Strips Nest `GlobalResponseInterceptor` envelope when present. */
export function unwrapNestPayload<T = unknown>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    (payload as { success: unknown }).success === true &&
    'data' in payload
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
