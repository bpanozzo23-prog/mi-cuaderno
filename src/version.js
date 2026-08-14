import pkg from "../package.json";

export const APP_VERSION = pkg.version;

/** Bumping this requires a migration plan and an export-first reminder (brief section 5). */
export const SCHEMA_VERSION = 9;
