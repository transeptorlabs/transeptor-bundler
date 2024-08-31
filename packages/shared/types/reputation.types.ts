/**
 * throttled entities are allowed minimal number of entries per bundle. banned entities are allowed none
 */

export enum ReputationStatus {
    OK, THROTTLED, BANNED
}

export interface ReputationParams {
    minInclusionDenominator: number
    throttlingSlack: number
    banSlack: number
}

export interface ReputationEntry {
    address: string
    opsSeen: number
    opsIncluded: number
    status?: ReputationStatus
}
