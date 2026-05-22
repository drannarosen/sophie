import type { BaseRecord } from "../schema/base-record.js";

/**
 * `createPedagogyRecord` — convenience constructor that injects the
 * `BaseRecordSchema` boilerplate (timestamps, schema_version, etc.) so
 * call sites stay focused on the typed payload.
 *
 * @example
 * ```ts
 * const fsrsRecord = createPedagogyRecord({
 *   user_id: getUserId(courseId),
 *   course_id: "astr201-sp26",
 *   state_type: "fsrs_state",
 *   schema_version: "1.0.0",
 *   payload: { target_id: "logs-q1", difficulty: 5.2, stability: 7.1 },
 * });
 * ```
 *
 * The returned object satisfies `BaseRecord & T` where `T` is the
 * payload shape; downstream code parses with the concrete schema
 * (e.g., `FSRSRecordSchema.parse(record)`) to get full validation.
 */
export function createPedagogyRecord<T extends Record<string, unknown>>(args: {
  user_id: string;
  course_id: string;
  state_type: string;
  schema_version: string;
  payload: T;
}): BaseRecord & T {
  const now = new Date().toISOString();
  return {
    user_id: args.user_id,
    course_id: args.course_id,
    state_type: args.state_type,
    schema_version: args.schema_version,
    created_at: now,
    updated_at: now,
    ...args.payload,
  } as BaseRecord & T;
}
