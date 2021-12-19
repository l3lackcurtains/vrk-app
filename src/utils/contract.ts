import { useWeb3React } from "@web3-react/core";
import { useMemo } from "react";
import config from "./config";
import swapAbi from "./abis/swap.json";
import tokenAbi from "./abis/token.json";
import { Contract } from "@ethersproject/contracts";

export function useSwapContract() {
  const { library, account } = useWeb3React();

  return useMemo(() => {
    try {
      return new Contract(
        config.SWAP_ADDRESS,
        swapAbi,
        library.getSigner(account).connectUnchecked()
      );
    } catch (error) {
      return null;
    }
  }, [library, account]);
}

export function useTokenContract() {
  const { library, account } = useWeb3React();
  return useMemo(() => {
    try {
      return new Contract(
        config.TOKEN_ADDRESS,
        tokenAbi,
        library.getSigner(account).connectUnchecked()
      );
    } catch (error) {
      return null;
    }
  }, [library, account]);
}
