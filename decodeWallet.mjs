import * as wCrypto from './src/walletCrypto/index.js'
import { readFile } from 'fs/promises';
import fs from 'fs';
const data = await readFile('./INPUT.json');
const password = JSON.parse(data).password;

const done = () => {
    console.error('Done');
  };

wCrypto.decryptWallet(password, data).fork(done, (wallet) => {
  console.log(wallet ? wallet : "Input is not correct");
  fs.writeFileSync('output.json', JSON.stringify(wallet, null, 2));

   // console.log(`${wallet.guid}  ==? d9e5766d-d646-4b3a-b32e-4bda649e4c45`)
    done()
  })

