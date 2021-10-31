const algosdk = require('algosdk');

// Replace the number with one obtained after ASA creation in the terminal.
// The command for ASA creation:
// ./sandbox goal asset create --creator $(./sandbox goal account list | awk 'NR==1 {print $2}') --unitname TEST --total 1000 --decimals 0
// Note it must be executed within the Sandbox directory.
// We are expecting that TEST asset id is 1.
const ASSET_ID = 1;

// Standard Algod credentials in the Sandbox
const algodToken =
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const algodServer = 'http://localhost';
const algodPort = '4001';

const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

// Standard Kmd credentials in the Sandbox
const kmdToken =
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const kmdServer = 'http://localhost';
const kmdPort = '4002';

const kmdClient = new algosdk.Kmd(kmdToken, kmdServer, kmdPort);

(async () => {
  // The same demo credentials are used across all code examples.
  // Avoid using them in production code.
  const depositWalletPassword = 'Passw0rd!';
  const defaultWalletPassword = ''; // no password for the default wallet in the Sandbox

  // FIND ACCOUNT ADDRESSES

  const { wallets } = await kmdClient.listWallets();

  // Get the first one from Sandbox default addresses
  const defaultWallet = wallets.find(
    ({ name }) => name === 'unencrypted-default-wallet'
  );
  const { wallet_handle_token: defaultWalletHandle } =
    await kmdClient.initWalletHandle(defaultWallet.id, defaultWalletPassword);
  const {
    addresses: [defaultAddress]
  } = await kmdClient.listKeys(defaultWalletHandle);

  // Get first address from our deposit_wallet
  const depositWallet = wallets.find(({ name }) => name === 'deposit_wallet');
  const { wallet_handle_token: depositWalletHandle } =
    await kmdClient.initWalletHandle(depositWallet.id, depositWalletPassword);
  const {
    addresses: [depositAddress]
  } = await kmdClient.listKeys(depositWalletHandle);

  // MAKE AN OPT-IN

  // Create a transaction sending necessary amount to the account we want to opt-in (the top up transaction)
  const txo1 = await (async () => {
    const requiredAmount = 0.201; // Minimal balance + transaction fee (in Algos)
    const amount = algosdk.algosToMicroalgos(requiredAmount);
    const sender = defaultAddress;
    const receiver = depositAddress;
    const params = await algodClient.getTransactionParams().do();
    const closeRemainderTo = undefined; // not used since we don't want to close the account
    const note = undefined; // no additional notes

    const txo = algosdk.makePaymentTxnWithSuggestedParams(
      sender,
      receiver,
      amount,
      closeRemainderTo,
      note,
      params
    );

    return txo;
  })();

  // Create an opt-in transaction
  const txo2 = await (async () => {
    // Provide asset id we want to opt-in. We are expecting that it's 1.
    const assetId = ASSET_ID;
    const amount = 0;

    const params = await algodClient.getTransactionParams().do();
    const closeRemainderTo = undefined;
    const revocationTarget = undefined;
    const note = undefined;

    // Create opt-in transaction (note that sender and receiver addresses are the same)
    const txo = algosdk.makeAssetTransferTxnWithSuggestedParams(
      depositAddress,
      depositAddress,
      closeRemainderTo,
      revocationTarget,
      amount,
      note,
      assetId,
      params
    );

    return txo;
  })();

  algosdk.assignGroupID([txo1, txo2]);

  // Sign the top up transaction
  const blob1 = await kmdClient.signTransaction(
    defaultWalletHandle,
    defaultWalletPassword,
    txo1
  );

  // Sign the opt-in transaction
  const blob2 = await kmdClient.signTransaction(
    depositWalletHandle,
    depositWalletPassword,
    txo2
  );

  // Send both transactions as an atomic group
  const { txId } = await algodClient.sendRawTransaction([blob1, blob2]).do();
  await waitForConfirmation(algodClient, txId);

  console.log('Opt-in settled');
})().catch((error) => {
  console.error(error);
});

// HELPER FUNCTION

/**
 * Resolves when transaction is confirmed.
 *
 * @param {Algodv2} algodClient Instance of the Algodv2 client
 * @param {String} txId Transaction Id to watch on
 * @param {Number} [timeout=60000] Waiting timeout (default: 1 minute)
 * @return {Object} Transaction object
 */
async function waitForConfirmation(algodClient, txId, timeout = 60000) {
  let { 'last-round': lastRound } = await algodClient.status().do();
  while (timeout > 0) {
    const startTime = Date.now();
    // Get transaction details
    const txInfo = await algodClient.pendingTransactionInformation(txId).do();
    if (txInfo) {
      if (txInfo['confirmed-round']) {
        return txInfo;
      } else if (txInfo['pool-error'] && txInfo['pool-error'].length > 0) {
        throw new Error(txInfo['pool-error']);
      }
    }
    // Wait for the next round
    await algodClient.statusAfterBlock(++lastRound).do();
    timeout -= Date.now() - startTime;
  }
  throw new Error('Timeout exceeded');
}
