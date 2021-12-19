import { UpDownIcon } from "@chakra-ui/icons";
import {
  Avatar,
  Box,
  Button,
  Center,
  Container,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  useToast,
} from "@chakra-ui/react";
import styled from "@emotion/styled";
import { useWeb3React } from "@web3-react/core";
import { ethers } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import EthereumImage from "../images/ethereum.png";
import VrkImage from "../images/vrk.png";
import config from "../utils/config";
import { injected } from "../utils/connectors";
import { useSwapContract, useTokenContract } from "../utils/contract";
import { getErrorMessage } from "../utils/web3";

// Max allowance limit, use different in production
const ALLOWANCE_LIMIT = ethers.BigNumber.from(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);

function Main() {
  const { activate, active, library, account, error } = useWeb3React();

  // Swap from state
  const [swapFrom, setSwapFrom] = useState({
    balance: 0,
    name: "ETH",
    icon: EthereumImage,
  });

  // Swap to state
  const [swapTo, setSwapTo] = useState({
    balance: 0,
    name: "VRK",
    icon: VrkImage,
  });

  // Form Input state
  const [swapFromAmount, setSwapFromAmount] = useState<string>("");
  const [swapToAmount, setSwapToAmount] = useState<string>("");

  // State for component refresh
  const [refresh, setRefresh] = useState<boolean>(false);

  // State from smart contract
  const [exchangeRate, setExchangeRate] = useState<number>(500);
  const [allowance, setAllowance] = useState<boolean>(true);

  // Button text and color state
  const [actionText, setActionText] = useState({
    color: "teal",
    text: "Connect Wallet",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Contracts
  const tokenContract = useTokenContract();
  const swapContract = useSwapContract();

  // Toast
  const toast = useToast();

  // Initial load
  useEffect(() => {
    let stale = false;

    const loadData = async () => {
      try {
        const ethBalance = formatEther(await library.getBalance(account));
        const tokenBalance = formatEther(
          await tokenContract?.balanceOf(account)
        );
        if (!stale) {
          setSwapFrom((previousState) => ({
            ...previousState,
            balance:
              previousState.name === "ETH"
                ? parseFloat(ethBalance)
                : parseFloat(tokenBalance),
          }));

          setSwapTo((previousState) => ({
            ...previousState,
            balance:
              previousState.name === "ETH"
                ? parseFloat(ethBalance)
                : parseFloat(tokenBalance),
          }));
        }

        const tokenAllowance = await tokenContract?.allowance(
          account,
          config.SWAP_ADDRESS
        );
        if (!stale) {
          if (!tokenAllowance.eq(0)) {
            setAllowance(true);
          } else {
            setAllowance(false);
          }
        }

        const ex = parseInt(await swapContract?.exchangeRate());
        if (!stale) {
          setExchangeRate(ex);
        }
      } catch (e) {
        toast({
          title: "Error getting data.",
          status: "error",
          duration: 9000,
          isClosable: true,
        });
      }
    };

    if (active) {
      loadData();
    }

    if (error) {
      toast({
        title: "Error in connection.",
        description: getErrorMessage(error),
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    }

    return () => {
      stale = true;
    };
  }, [
    active,
    library,
    account,
    tokenContract,
    swapContract,
    refresh,
    toast,
    error,
  ]);

  // Changes for button text and bg color
  useEffect(() => {
    const changeActionText = async () => {
      if (!active) {
        setActionText({
          color: "teal",
          text: "Connect Wallet",
        });
      } else {
        if (swapFrom.name !== "ETH" && !allowance) {
          setActionText({
            color: "blue",
            text: "Approve VRK",
          });
        } else {
          setActionText({
            color: "green",
            text: "Swap",
          });
        }

        if (swapFrom.balance < parseFloat(swapFromAmount)) {
          setActionText({
            color: "red",
            text: "Low Balance",
          });
        }
      }
    };
    changeActionText();
  }, [active, allowance, swapFrom, swapFromAmount, refresh]);

  // Connect wallet
  const connect = async () => {
    setIsLoading(true);
    try {
      await activate(injected);
    } catch (e) {
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
  };

  // Approve token
  const approveToken = async () => {
    setIsLoading(true);
    try {
      const approved = await tokenContract?.approve(
        config.SWAP_ADDRESS,
        ALLOWANCE_LIMIT
      );

      library.once(approved.hash, (done: any) => {
        if (done.status === 1) {
          toast({
            title: "VRK Approved",
            status: "success",
            duration: 9000,
            isClosable: true,
          });
          setRefresh(!refresh);
        } else {
          toast({
            title: "VRK Approved Failed",
            status: "error",
            duration: 9000,
            isClosable: true,
          });
        }
        setIsLoading(false);
      });
    } catch (e) {
      toast({
        title: "VRK Approved Failed",
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    }
  };

  // Swap token
  const swap = async () => {
    if (!swapFromAmount) {
      toast({
        title: "Input Amount",
        status: "error",
        duration: 9000,
        isClosable: true,
      });
      return;
    }

    const amount = parseEther(swapFromAmount);

    if (swapFrom.balance < parseFloat(swapFromAmount)) {
      return;
    }
    setIsLoading(true);
    try {
      if (swapFrom.name === "ETH") {
        const swapped = await swapContract?.swapEthToToken({
          value: amount,
        });

        library.once(swapped.hash, (done: any) => {
          if (done.status === 1) {
            toast({
              title: "Swap successful",
              description: `${swapFromAmount} ETH has been swapped with ${swapToAmount} VRK.`,
              status: "success",
              duration: 9000,
              isClosable: true,
            });
            setRefresh(!refresh);
          } else {
            toast({
              title: "Swap Failed",
              status: "error",
              duration: 9000,
              isClosable: true,
            });
          }
          setIsLoading(false);
        });
      } else {
        const swapped = await swapContract?.swapTokenToEth(amount);
        library.once(swapped.hash, (done: any) => {
          if (done.status === 1) {
            toast({
              title: "Swap Successfull",
              description: `${swapFromAmount} VRK has been swapped with ${swapToAmount} ETH.`,
              status: "success",
              duration: 9000,
              isClosable: true,
            });
            setRefresh(!refresh);
          } else {
            toast({
              title: "Swap Failed",
              status: "error",
              duration: 9000,
              isClosable: true,
            });
          }
          setIsLoading(false);
        });
      }
    } catch (e) {
      toast({
        title: "Swap Failed",
        status: "error",
        duration: 9000,
        isClosable: true,
      });

      setIsLoading(false);
    }
  };

  // Swap position change
  const changeSwapPosition = () => {
    const temp = swapFrom;
    setSwapFrom(swapTo);
    setSwapTo(temp);

    const tempAmount = swapFromAmount;
    setSwapFromAmount(swapToAmount);
    setSwapToAmount(tempAmount);
  };

  // The action of the button
  const onMainAction = async () => {
    if (!active) {
      await connect();
    } else {
      if (swapFrom.name !== "ETH" && !allowance) {
        await approveToken();
      } else {
        await swap();
      }
    }
  };

  // Change swap from input field
  const swapFromChange = (val: string) => {
    setSwapFromAmount(val);
    const amount = parseFloat(val);
    if (swapFrom.name === "ETH") {
      const toAmount = (amount * exchangeRate).toString();
      setSwapToAmount(toAmount);
    } else {
      const toAmount = (amount / exchangeRate).toString();
      setSwapToAmount(toAmount);
    }
  };

  // Change swap to input field
  const swapToChange = (val: string) => {
    setSwapToAmount(val);
    const amount = parseFloat(val);
    if (swapFrom.name === "ETH") {
      const fromAmount = (amount / exchangeRate).toString();
      setSwapFromAmount(fromAmount);
    } else {
      const fromAmount = (amount * exchangeRate).toString();
      setSwapFromAmount(fromAmount);
    }
  };

  return (
    <Container maxW="container.lg" centerContent>
      <Header />
      <StyledBox
        maxW="md"
        borderRadius="lg"
        overflow="hidden"
        px="5"
        py="6"
        my="24"
      >
        <Box my={4}>
          <InputGroup size="lg">
            <InputLeftElement width="6rem" p="2">
              <Avatar name={swapFrom.name} w={10} h={10} src={swapFrom.icon} />
              <Text px="2" fontSize="log" fontWeight={500}>
                {swapFrom.name}
              </Text>
            </InputLeftElement>
            <Input
              pl="7rem"
              type="number"
              placeholder="0.0"
              textAlign="right"
              value={swapFromAmount}
              onChange={(e) => {
                const val = e.target.value;
                swapFromChange(val);
              }}
            />
          </InputGroup>
          <Button
            variant="link"
            onClick={() => {
              setSwapFromAmount(swapFrom.balance.toString());
            }}
          >
            <Text fontSize={13}>
              Balance: {swapFrom.balance} {swapFrom.name}
            </Text>
          </Button>
        </Box>

        <Center>
          <Button onClick={() => changeSwapPosition()}>
            <UpDownIcon w={6} h={6} />
          </Button>
        </Center>

        <Box my={4}>
          <InputGroup size="lg">
            <InputLeftElement width="6rem" p="2">
              <Avatar name={swapTo.name} w={10} h={10} src={swapTo.icon} />
              <Text px="2" fontSize="log" fontWeight={500}>
                {swapTo.name}
              </Text>
            </InputLeftElement>
            <Input
              pl="7rem"
              type="number"
              placeholder="0.0"
              textAlign="right"
              value={swapToAmount}
              onChange={(e) => {
                const val = e.target.value;
                swapToChange(val);
              }}
            />
          </InputGroup>
          <Button
            variant="link"
            onClick={() => {
              setSwapToAmount(swapTo.balance.toString());
            }}
          >
            <Text fontSize={13}>
              Balance: {swapTo.balance} {swapTo.name}
            </Text>
          </Button>
        </Box>
        <Button
          isLoading={isLoading}
          my="4"
          isFullWidth
          colorScheme={actionText.color}
          size="lg"
          onClick={() => onMainAction()}
        >
          {actionText.text}
        </Button>
      </StyledBox>
    </Container>
  );
}

const StyledBox = styled(Box)`
  box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
`;

export default Main;
