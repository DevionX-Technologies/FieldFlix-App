/**
 * Strips Nest `GlobalResponseInterceptor` body shape:
 * `{ success: true, uuid, event, data: T }` → `T`
 *
 * Only unwraps when `success === true` and `data` is present, so we do not
 * break arbitrary JSON that happens to have a `data` property.
 */
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
