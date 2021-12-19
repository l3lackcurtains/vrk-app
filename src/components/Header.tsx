import {
  Flex,
  Spacer,
  Box,
  Container,
  Image,
  Text,
  Button,
  Popover,
  PopoverTrigger,
  Portal,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverBody,
  PopoverHeader,
  useToast,
} from "@chakra-ui/react";
import { useWeb3React } from "@web3-react/core";
import Logo from "../images/logo.png";
const Header = () => {
  const { active, deactivate, account } = useWeb3React();
  const toast = useToast();
  // Disconnect wallet
  async function disconnect() {
    try {
      deactivate();
    } catch (e) {
      toast({
        title: "Wallet disconnect Failed",
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    }
  }
  return (
    <Container maxW="container.md" h={30}>
      <Flex>
        <Box p="4">
          <Image atl="swap" w={24} src={Logo} />
        </Box>
        <Spacer />
        {active ? (
          <Box p="4">
            <Popover>
              <PopoverTrigger>
                <Button colorScheme="teal" variant="ghost">
                  <Flex alignItems={"center"}>
                    <Image
                      w={8}
                      h={8}
                      atl="Account"
                      src={`https://avatars.dicebear.com/v2/male/:${account}.svg`}
                    />
                    <Text fontSize="sm" px={2}>
                      {" "}
                      {`${account?.substring(0, 4)}...${account?.substring(
                        account.length - 4
                      )}`}
                    </Text>
                  </Flex>
                </Button>
              </PopoverTrigger>
              <Portal>
                <PopoverContent>
                  <PopoverArrow />
                  <PopoverHeader>Connected to Ropsten Network</PopoverHeader>
                  <PopoverCloseButton />
                  <PopoverBody>
                    <Button
                      isFullWidth
                      colorScheme="red"
                      onClick={() => disconnect()}
                    >
                      Disconnect
                    </Button>
                  </PopoverBody>
                </PopoverContent>
              </Portal>
            </Popover>
          </Box>
        ) : (
          <></>
        )}
      </Flex>
    </Container>
  );
};

export default Header;
