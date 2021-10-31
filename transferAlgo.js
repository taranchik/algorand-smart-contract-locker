const algosdk = require('algosdk');

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

  // CREATE A TRANSACTION OBJECT

  const sender = defaultAddress;
  const receiver = depositAddress;

  // Transaction amount must be specified in microAlgos
  const amount = algosdk.algosToMicroalgos(0.5);

  // Get transaction params template
  const params = await algodClient.getTransactionParams().do();
  const closeRemainderTo = undefined; // not used since we don't want to close the account
  const note = undefined; // no additional notes

  // Create new transaction object
  const txo = algosdk.makePaymentTxnWithSuggestedParams(
    sender,
    receiver,
    amount,
    closeRemainderTo,
    note,
    params
  );

  // Sign the transaction
  const blob = await kmdClient.signTransaction(
    defaultWalletHandle,
    defaultWalletPassword,
    txo
  );

  // Send transaction to the Algorand network
  const { txId } = await algodClient.sendRawTransaction(blob).do();

  // Wait until the transaction is settled using a helper function (see below)
  await waitForConfirmation(algodClient, txId);

  const humanReadableAmount = algosdk.microalgosToAlgos(amount);
  console.log(
    `${humanReadableAmount} Algo transferred from ${sender} to ${receiver}`
  );
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
 * @return {Object} Transaction information
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
