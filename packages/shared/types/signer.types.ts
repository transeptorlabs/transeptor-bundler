import { Wallet} from 'ethers'

export type BundlerSignerWallets = Record<number, Wallet>;

export type PendingTxDetails = {
    txHash: string;
    signerIndex: number
}

export type BundleTxs = Record<string, PendingTxDetails>;
