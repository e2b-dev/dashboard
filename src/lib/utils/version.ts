import * as semver from 'semver'

/**
 * Compare two semantic version strings
 * @param version1 - First version string to compare
 * @param version2 - Second version string to compare
 * @returns true if version1 is greater than or equal to version2, false otherwise
 */
export function isVersionGreaterOrEqual(
  version1: string,
  version2: string
): boolean {
  try {
    return semver.gte(version1, version2)
  } catch (error) {
    // If semver parsing fails, fall back to string comparison as a last resort
    console.warn(
      `Failed to parse version strings: ${version1}, ${version2}`,
      error
    )
    return version1 >= version2
  }
}

/**
 * Check if a version meets the minimum required version
 * @param currentVersion - The current version to check
 * @param minimumVersion - The minimum required version
 * @returns true if currentVersion meets or exceeds minimumVersion
 */
export function isVersionCompatible(
  currentVersion: string,
  minimumVersion: string
): boolean {
  return isVersionGreaterOrEqual(currentVersion, minimumVersion)
}
