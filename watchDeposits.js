const algosdk = require("algosdk");
const DepositWatcher = require("./DepositWatcher");

// Standard Indexer credentials in the Sandbox
const indexerToken = ""; // no token in the Sandbox
const indexerServer = "http://localhost";
const indexerPort = 8980;

const indexerClient = new algosdk.Indexer(
  indexerToken,
  indexerServer,
  indexerPort
);

// mnemonic wallet phrase
// various smoke salute museum whip wish account very shallow either slide crouch coast follow radio trial hair present crater amateur effort outdoor baby able indicate

// Standard Kmd credentials in the Sandbox
const kmdToken =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const kmdServer = "http://localhost";
const kmdPort = "4002";

const kmdClient = new algosdk.Kmd(kmdToken, kmdServer, kmdPort);

(async () => {
  // The same demo credentials are used across all code examples.
  // Avoid using them in production code.
  const depositWalletPassword = "Passw0rd!";

  // Get addresses from deposit_wallet
  const { wallets } = await kmdClient.listWallets();
  const depositWallet = wallets.find(({ name }) => name === "deposit_wallet");
  const { wallet_handle_token } = await kmdClient.initWalletHandle(
    depositWallet.id,
    depositWalletPassword
  );
  const { addresses } = await kmdClient.listKeys(wallet_handle_token);

  // Init DepositWatcher
  const depositWatcher = new DepositWatcher(indexerClient, addresses);

  console.log("Waiting for deposits...");

  // Subscribe to deposit envents
  depositWatcher.on("deposit_algo", (txInfo) => {
    console.log("Algo Deposit: ", txInfo);
  });

  depositWatcher.on("deposit_asa", (txInfo) => {
    console.log("ASA Deposit: ", txInfo);
  });
})().catch((error) => {
  console.error(error);
});
