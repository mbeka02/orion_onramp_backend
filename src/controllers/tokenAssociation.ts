import { Request, Response } from "express";
import logger from "../lib/logger";
import hederaChainModel from "../models/chain/hedera";
import { TOKEN_TYPE } from "../types/token";

export const checkTokenAssociation = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({
        error: "Wallet address is required",
      });
    }

    const kesyTokenId = process.env.KESY_TESTNET_TOKEN_ID;
    if (!kesyTokenId) {
      logger.error(
        "Token Association Controller: KESy token ID not configured in environment",
      );
      return res.status(500).json({
        error: "Token configuration error",
      });
    }

    const isAssociated = await hederaChainModel._checkIfAssociated(
      TOKEN_TYPE.KESy_TESTNET,
      kesyTokenId,
      walletAddress,
    );

    return res.status(200).json({
      isAssociated,
      walletAddress,
      tokenId: kesyTokenId,
      tokenName: "KESy",
    });
  } catch (error) {
    logger.error("Token Association Controller: Error checking association", {
      error,
      walletAddress: req.params.walletAddress,
    });
    return res.status(500).json({
      error: "Failed to check token association",
    });
  }
};
