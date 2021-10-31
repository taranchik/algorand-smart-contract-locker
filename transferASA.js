const algosdk = require('algosdk');

// Replace the number with one obtained after ASA creation in the terminal.
// We are expecting that it's 1.
const ASSET_ID = 8;

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

  // TRANSFER AN ASA

  const assetId = ASSET_ID;
  const amount = 10; // 10 TEST

  const sender = defaultAddress;
  const receiver = depositAddress;

  const params = await algodClient.getTransactionParams().do();
  const closeRemainderTo = undefined;
  const revocationTarget = undefined;
  const note = undefined;

  // Create asset transfer transaction
  const txo = algosdk.makeAssetTransferTxnWithSuggestedParams(
    sender,
    receiver,
    closeRemainderTo,
    revocationTarget,
    amount,
    note,
    assetId,
    params
  );

  // Sign the transaction
  const blob = await kmdClient.signTransaction(
    defaultWalletHandle,
    defaultWalletPassword,
    txo
  );

  // Send the transactions
  const { txId } = await algodClient.sendRawTransaction(blob).do();
  await waitForConfirmation(algodClient, txId);

  console.log(amount, 'TEST sucessfully transferred');
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
