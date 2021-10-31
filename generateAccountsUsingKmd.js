const algosdk = require('algosdk');

// Standard Kmd credentials in the Sandbox
const token =
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const server = 'http://localhost';
const port = '4002';

const kmdClient = new algosdk.Kmd(token, server, port);

(async () => {
  // The same demo credentials are used across all code examples.
  // Avoid using them in production code.
  const walletName = 'deposit_wallet';
  const walletPassword = 'Passw0rd!';
  const walletMnemonic =
    'lunar peace photo despair entry sketch zone cook recall lab float deposit proud sniff danger forest aware reopen allow mass horror boil alone above voyage';

  // Restore master derivation key from the mnemonic
  const masterDerivationKey = await algosdk.mnemonicToMasterDerivationKey(
    walletMnemonic
  );

  // Restore wallet
  const { wallet } = await kmdClient.createWallet(
    walletName,
    walletPassword,
    masterDerivationKey
  );

  console.log('Wallet successfully restored');
  console.log('Wallet Id:', wallet.id);

  // Generate first 10 accounts
  console.log('First 10 accounts:');

  const { wallet_handle_token } = await kmdClient.initWalletHandle(
    wallet.id,
    walletPassword
  );

  for (let i = 0; i < 10; i++) {
    const { address } = await kmdClient.generateKey(wallet_handle_token);
    console.log(address);
  }
})().catch((error) => {
  console.error(error);
});
