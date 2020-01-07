![NEAR Protocol logo](./src/assets/near.svg)

## Visualizing new NEAR accounts per block 

This is a React project created with the package [create-near-app](https://www.npmjs.com/package/create-near-app) using the command:

`npx create-near-app path/to/my-near-react-app`

It uses [D3.js](https://d3js.org/) to create a live-updating chart showing accounts created per block in a stacked bar chart. (Stacked meaning multiple accounts created in the same block will "stack" on top of one another.)

This project uses NEAR Protocol's [nearlib](https://docs.nearprotocol.com/docs/roles/developer/examples/nearlib/introduction) to connect to the blockchain. You may click on each block to see a simple modal showing which user was created.

---

### Quick run-down on how this is achieved 

Each block in the blockchain has a unique height and hash associated with it. We can get the most recent block and work backwards through the chain. Each block consists of chunks. Chunks may have transactions of various types. To find blocks where a new NEAR account has been created, we look for the `CreateAccount` action within a chunk's transaction.

---

**Problem**: blocks are created all the time that do not have the `CreateAccount` transaction that populates this chart. Also, a blank chart is very boring.

**Solution**: use hardcoded mock data for the first few bars, illustrating what it looks like when multiple, stacked accounts exist per block. Then, look up four hardcoded block numbers known to have new accounts associated with them. This illustrates the actual call to retrieve the blocks and update the chart live. 

**Note**: since the above-mentioned hardcoded block hashes are on the testnet, we're not guaranteed that they'll persist.

### Challenges

This solution uses timers to poll. There are three different types of polling: 

1. Latest block on the chain

   Fetch the latest block on the chain. This is covered in the [NEAR docs](https://docs.nearprotocol.com/docs/roles/developer/examples/nearlib/examples#nearconnectionproviderblock).

2. Processing "gap blocks"

   This app keeps track of the maximum block height checked. (Checked meaning we've looked through the block's chunks for transactions containing `action` has `CreateAccount`) By keeping track, we can tell if there is a "gap" in blocks we've checked since the latest block in the chain. For instance, there have been 7 blocks added to the chain since we last polled. Those seven blocks will be added to a queue, essentially, and processed by a timer that fires more frequently.

3. Fetching historical blocks.

   We also traverse the blockchain backward in order to find recently created blocks. We start with the latest block and move backwards a set amount of iterations (see `maxIterations` variable). Each `CreateAccount` transaction we come across is added to the chart. When the historical polling has reached its limit, it ceases to traverse backward and the timer is no longer used.

### Requirements
##### IMPORTANT: Make sure you have the latest version of NEAR Shell and Node Version > 10.x 
1. node and npm
2. near shell
install with 
```
npm i -g near-shell
```
3.(optional) install yarn to build
```
npm i -g yarn
```

### To run on testnet
Step 1: Create account for the contract and deploy the contract.
In the terminal
```
near login
```
click the link and create your own contract ID

Step 2:
modify src/config.js line that sets the contractName. Set it to id from step 1.
```
const CONTRACT_NAME = "contractId"; /* TODO: fill this in! */
```

Step 3:
Finally, run the command in your terminal.
```
npm install
npm run(yarn) prestart
npm run(yarn) start
```
The server that starts is for static assets and by default serves them to localhost:3000. Navigate there in your browser to see the app running!

## To Explore

- `assembly/main.ts` for the contract code
- `public/index.html` for the front-end HTML
- `src/index.js` for the JavaScript front-end code and how to integrate contracts
- `src/App.js` for the first react component
