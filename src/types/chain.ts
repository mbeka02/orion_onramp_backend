import { z } from "zod";

export enum SUPPORTED_CHAINS {
  HEDERA_MAINNET = "hedera_mainnet",
  HEDERA_TESTNET = "hedera_testnet",
}

export enum API_NODES {
  HEDERA_MAINNET = "https://mainnet.mirrornode.hedera.com",
  HEDERA_TESTNET = "https://testnet.mirrornode.hedera.com",
}

export const hederaTokenBalanceSchema = z.object({
  tokens: z.array(
    z.object({
      automatic_association: z.boolean(),
      balance: z.number(),
      created_timestamp: z.string(),
      decimals: z.number(),
      token_id: z.string(),
      freeze_status: z.string(),
      kyc_status: z.string(),
    }),
  ),
});

export const hederaAccountDetailsSchema = z.object({
  tokens: z.array(
    z.object({
      automatic_association: z.boolean(),
      balance: z.number(),
      created_timestamp: z.string(),
      decimals: z.number(),
      token_id: z.string(),
      freeze_status: z.string(),
      kyc_status: z.string(),
    }),
  ),
  links: z.object({
    next: z.string().nullable(),
  }),
});
