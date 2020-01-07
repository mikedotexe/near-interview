import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import getConfig from './config.js';
import * as nearlib from 'nearlib';

// Initializing contract
async function InitContract() {
  window.nearConfig = getConfig('development');
  // Initializing connection to the NEAR DevNet.
  window.near = await nearlib.connect(Object.assign({ deps: { keyStore: new nearlib.keyStores.BrowserLocalStorageKeyStore() } }, window.nearConfig));
  window.walletAccount = new nearlib.WalletAccount(window.near);
  window.accountId = window.walletAccount.getAccountId();
  let acct = await new nearlib.Account(window.near.connection, window.accountId);
  window.contract = await new nearlib.Contract(acct, window.nearConfig.contractName, {
    viewMethods: ['welcome',],
    changeMethods: [],
    sender: window.accountId
  });
}

window.nearInitPromise = InitContract().then(() => {
    ReactDOM.render(<App contract={window.contract} wallet={window.walletAccount} provider={window.near.connection.provider}/>,
      document.getElementById('root')
    );
  }).catch(console.error)