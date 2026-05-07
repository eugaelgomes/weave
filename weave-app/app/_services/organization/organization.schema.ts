import { z } from "zod";

/**
 * Organization API responses are wrapped in varying envelope shapes; we validate
 * a generic JSON object at the HTTP boundary so downstream logic stays unchanged.
 */
export const OrgJsonSchema = z.record(z.string(), z.unknown());
