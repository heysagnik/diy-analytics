/**
 * The frontend's TypeScript types (types/analytics.ts, and several
 * components' local Goal/Alert interfaces) still expect a Mongo-style
 * `_id` field — reshaping every consumer to `id` is out of scope for this
 * persistence-layer migration. Route handlers call this to keep the JSON
 * wire shape unchanged while the DB column is named `id` internally.
 */
export function withMongoId<T extends { id: string }>(row: T): Omit<T, 'id'> & { _id: string } {
  const { id, ...rest } = row;
  return { ...rest, _id: id };
}
