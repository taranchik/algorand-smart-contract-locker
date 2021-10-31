const algosdk = require('algosdk');

const { addr, sk } = algosdk.generateAccount();
const mnemonic = algosdk.secretKeyToMnemonic(sk);

console.log('Address:', addr);
console.log('Mnemonic:', mnemonic);
