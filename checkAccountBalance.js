const algosdk = require('algosdk');

const algodToken =
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const algodServer = 'http://localhost';
const algodPort = '4001';

const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

const MINIMAL_BALANCE = 100000;

(async () => {
  // The same credentials are used across all code examples.
  // Avoid using them in production code.
  const addr1 = 'A7B3YODYRUP24PWUT45JL4G7EQA72FHY4KVL3A7CI6EXGGVD5O7SM6MAIQ';
  const addr2 = 'S6YJQLGRUSCKG5PVFW77PE7SKTU6AELITMCVXPQBE7EMLG5224KNQ4WH2A';

  const transferAmount = algosdk.algosToMicroalgos(0.001);

  await checkExpectedBalance(addr1, transferAmount);
  await checkExpectedBalance(addr2, transferAmount);
})().catch((error) => {
  console.error(error);
});

async function checkExpectedBalance(address, transferAmount) {
  console.log(`Cheking ${address} balance:`);

  const amount = algosdk.microalgosToAlgos(transferAmount);

  // Current account balance
  const { amount: currentAmount } = await algodClient
    .accountInformation(address)
    .do();

  const expectedBalance = currentAmount + transferAmount;

  if (expectedBalance < MINIMAL_BALANCE) {
    const minimalAmount = algosdk.microalgosToAlgos(
      MINIMAL_BALANCE - transferAmount
    );

    console.log(`Insufficient balance to receive ${amount} Algo`);
    console.log(`Minimal transfer amount is ${minimalAmount} Algo\n`);
  } else {
    console.log(`Balance is sufficient to receive ${amount} ALgo\n`);
  }
}
