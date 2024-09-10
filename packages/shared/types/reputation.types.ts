/**
 * Throttled entities are allowed minimal number of entries per bundle. Banned entities are allowed none.
 */
export enum ReputationStatus {
  OK,
  THROTTLED,
  BANNED,
}

export type ReputationParams = {
  minInclusionDenominator: number
  throttlingSlack: number
  banSlack: number
}

export type ReputationEntry = {
  address: string
  opsSeen: number
  opsIncluded: number
  status?: ReputationStatus
}
