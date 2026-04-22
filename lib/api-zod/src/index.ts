// Re-export generated zod runtime schemas (validation objects)
export * from "./generated/api";
// Re-export generated TypeScript types (interfaces) — note that some names
// collide with zod schema names (e.g. CreateCompanyBody) so we re-export
// them as types only to avoid runtime conflicts.
// Note: type names that collide with zod runtime schemas (e.g. CreateCompanyBody)
// are intentionally NOT re-exported here. Zod schemas already provide types via
// z.infer<typeof Schema>. Import collision-free types directly from
// "@workspace/api-zod/generated/types" if needed.
export type {
  Company,
  CompanyType,
  HealthStatus,
  MeResponse,
} from "./generated/types";
