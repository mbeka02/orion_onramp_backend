import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import logger from "../lib/logger";
import { db } from "../lib/db";
import { treasuryBalanceTable } from "../lib/db/schema";
import hederaChainModel from "../models/chain/hedera";
import { TOKEN_TYPE } from "../types/token";

export const checkTokenAssociation = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const { tokenType } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        error: "Wallet address is required",
      });
    }

    if (!tokenType || !Object.values(TOKEN_TYPE).includes(tokenType as TOKEN_TYPE)) {
      return res.status(400).json({
        error: "Valid token type is required (KESy_MAINNET or KESy_TESTNET)",
      });
    }

    const tokenDetails = await db
      .select({
        address: treasuryBalanceTable.address,
      })
      .from(treasuryBalanceTable)
      .where(eq(treasuryBalanceTable.token, tokenType as TOKEN_TYPE));

    if (tokenDetails.length === 0) {
      logger.error(
        "Token Association Controller: Token not found in database",
        { tokenType },
      );
      return res.status(404).json({
        error: "Token not found",
      });
    }

    const tokenAddress = tokenDetails[0].address;

    const isAssociated = await hederaChainModel._checkIfAssociated(
      tokenType as TOKEN_TYPE,
      tokenAddress,
      walletAddress,
    );

    return res.status(200).json({
      isAssociated,
      walletAddress,
      tokenId: tokenAddress,
      tokenType,
      tokenName: "KESy",
    });
  } catch (error) {
    logger.error("Token Association Controller: Error checking association", {
      error,
      walletAddress: req.params.walletAddress,
      tokenType: req.query.tokenType,
    });
    console.error(error);
    return res.status(500).json({
      error: "Failed to check token association",
    });
  }
};
