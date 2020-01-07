import React, { Component } from 'react';
import StackedBarChart from './StackedBarChart';
import AttemptingBlock from './AttemptingBlock';
import getAccountCreatedExamples from './account-created-examples';
import nearlogo from './assets/gray_near_logo.svg';
import './App.css';

class App extends Component {
  maxBlocks = 6;
  maxAttemptsToShow = 3;
  maxIterations = 1991;
  maxGapBlockToShow = 7;
  demoPurposeMax = 50;

  constructor(props) {
    super(props);
    this.state = {
      recentBlocks: [],
      latestGapBlock: [],
      gapBlockNumsToCheck: [],
      humanReadableGapBlockNumsToCheck: [],
      // keep track of the highest height we've checked
      maxBlockHeightChecked: null,
      currentIterations: 0,
      timeLastChecked: null,
      // start with some dummy data of blocks with different # of accounts
      d3: {
        898382: {
          blockHeight: 898382,
          blockHash: 'x9k3',
          accounts: [
            {id: 'user02 (mock data)'},
          ]
        },
        898383: {
          blockHeight: 898383,
          blockHash: '29kx',
          accounts: [
            {id: 'jake145 (mock data)'}
          ]
        },
        898384: {
          blockHeight: 898384,
          blockHash: 'aa93',
          accounts: [
            {id: 'aloha (mock data)'},
            {id: 'honua (mock data)'},
          ]
        },
        898385: {
          blockHeight: 898385,
          blockHash: 'kv55',
          accounts: [
            {id: 'merlinmike (mock data)'},
            {id: 'vitalik (mock data)'},
            {id: 'jonesie (mock data)'},
          ]
        }
      }      
    };
    this.fetchKnownExamples = this.fetchKnownExamples.bind(this);
    this.addNewBlockAccount = this.addNewBlockAccount.bind(this);
    this.checkMaxBlockHeight = this.checkMaxBlockHeight.bind(this);
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
    clearTimeout(this.timerHistory);
    clearTimeout(this.timerRange);
    this.timer = null;
    this.timerHistory = null;
    this.timerRange = null;
  }

  componentDidMount() {
    // loads some actual blocks I know to be account creations, to fill it out
    this.fetchKnownExamples();
    // kicks off searching backwards through the blockchain for a given amount
    this.timedFetchHistorical();
    // get the most recent blocks
    this.timedFetchLatest();
    // there will always be "gap blocks" to check, this does that
    this.timedFetchGapBlocks();
  }

  addNewBlockAccount = (newBlockAccount) => {
    // update maxBlockHeightChecked if needed
    if (!this.state.d3.hasOwnProperty(newBlockAccount.blockHeight)) {
      this.setState(prevState => {
        const newD3 = prevState.d3;
        
        // TODO: use key prolly later
        if (!newD3.hasOwnProperty(newBlockAccount.blockHeight)) {
          newD3[newBlockAccount.blockHeight] = {
            blockHeight: newBlockAccount.blockHeight,
            blockHash: newBlockAccount.blockHash,
            accounts: [{
              id: newBlockAccount.account.metadata.receiverId 
            }],
          }
        } else {
          newD3[newBlockAccount.blockHeight].accounts.push({ 
            id: newBlockAccount.account.metadata.receiverId
          });
        }
        
        // we're only showing maxBlocks bars, if more than that, delete the oldest
        if (Object.keys(newD3).length > this.maxBlocks) {
          delete newD3[Object.keys(newD3)[0]];
        }
        
        return {
          d3: newD3,
        };
      });
    }
  };
  
  // returns true if it's a new max
  checkMaxBlockHeight(height) {
    let ret = false;
    if (height > this.state.maxBlockHeightChecked) {
      this.setState({
        maxBlockHeightChecked: height
      });
      ret = true;
    }
    return ret;
  }
  
  getActionFromBlock = async(block) => {
    let ret = {
      action: '',
      metadata: null
    };
    let chunkFromChunkHash = async c => { return await this.props.provider.chunk(c.chunk_hash) };
    const allChunks = await Promise.all(block.chunks.map(chunkFromChunkHash));
    
    // Filter for chunks with transactions
    let chunksContainingTxs = allChunks.filter(function (chunk) {
      return chunk.transactions.length !== 0;
    });
    
    // find any transactions in any chunks that have "actions" key
    chunksContainingTxs.forEach(chunk => {
      chunk.transactions.forEach(tx => {
        if (tx.hasOwnProperty('actions') && tx.actions.length !== 0) {
          // first entry is where it's stored, 0th index
          console.log("Found transaction actions: ", tx.actions);
          ret.action = tx.actions[0];
          
          // provide metadata particular to action
          // currently we only care about CreateAccount
          switch (ret.action) {
            case 'CreateAccount':
              ret.metadata = {
                receiverId: tx.receiver_id,
                signerId: tx.signer_id
              };
              break;
              
            default:
              console.warn('Ruh roh! No implementation yet for action: ', ret.action);
          }
        }
      });
    });

    return ret;
  };
  
  fetchKnownExamples = async () => {
    const exampleBlocks = getAccountCreatedExamples();
    for (let i = 0; i < exampleBlocks.length; i++) {
      const block = await this.props.provider.block(exampleBlocks[i]);
      const actionInfo = await this.getActionFromBlock(block);
      const blockAccount = {};
      blockAccount[block.header.height] = {
        blockHeight: block.header.height,
        blockHash: block.header.hash,
        account: {
          action: actionInfo.action,
          metadata: actionInfo.metadata
        }
      };
      if (actionInfo.action === 'CreateAccount') this.addNewBlockAccount(blockAccount[block.header.height]);
    }
  };

  fetchLatest = async () => {
    // get the most current block hash and corresponding block
    // TODO: change to const
    let latestHash = (await this.props.provider.status()).sync_info.latest_block_hash;
    const latestBlock = await this.props.provider.block(latestHash);
    
    // if we need to populate recentBlocks, we do the first time
    if (this.state.recentBlocks.length === 0) {
      this.setState(previous => ({
        recentBlocks: [latestBlock, ...previous.recentBlocks]
      }));
    }

    // get action info
    const actionInfo = await this.getActionFromBlock(latestBlock);
    const blockAccount = {};
    blockAccount[latestBlock.header.height] = {
      blockHeight: latestBlock.header.height,
      blockHash: latestBlock.header.hash,
      account: {
        action: actionInfo.action,
        metadata: actionInfo.metadata
      }
    };
    if (actionInfo.action === 'CreateAccount') this.addNewBlockAccount(blockAccount[latestBlock.header.height]); 
    
    // check to see if there's a gap
    // for example: we polled and turns out three blocks are new to us
    const maxBlockHeight = this.state.maxBlockHeightChecked;
    const gapDifference = latestBlock.header.height - maxBlockHeight;
    // for demo purposes, shimming in a max since there's fake data in here
    if (gapDifference > 1 && gapDifference < this.demoPurposeMax) {
      for (let i = 0; i < gapDifference; i++) {
        const blockNumber = maxBlockHeight + i + 1;
        if (!this.state.gapBlockNumsToCheck.hasOwnProperty(blockNumber)) {
          // hasn't been added, add
          if (this.state.gapBlockNumsToCheck.length === 0) {
            this.setState({ gapBlockNumsToCheck: [blockNumber] });
          } else {
            this.setState(previous => ({
              gapBlockNumsToCheck: [...previous.gapBlockNumsToCheck, blockNumber]
            }));
          }
          // human readable with ellipsis
          let firstFiveBlockNums = [];
          for (let i = 0; i < 5; i++) {
            if (this.state.gapBlockNumsToCheck.length > i + 1) {
              firstFiveBlockNums.push(this.state.gapBlockNumsToCheck[i])
            }
          }
          this.setState({
            humanReadableGapBlockNumsToCheck: firstFiveBlockNums
          })
        }
      }
    }
    
    // update the max block height
    this.checkMaxBlockHeight(latestBlock.header.height);

    this.setState({
      timeLastChecked: new Date().toLocaleString()
    })
  };

  timedFetchLatest = async () => {
    await this.fetchLatest();
    // Fetch the latest block
    if (this.timer !== null) { //} && this.state.recentBlocks.length < this.maxIterations) {
      this.timer = setTimeout(this.timedFetchLatest, 5000);
    }
  };
  
  fetchBlockNumber = async (blockNumber) => {
    const blockFromNumber = await this.props.provider.block(blockNumber);
    
    // update the right side of UI showing gap blocks checked
    this.setState(previous => ({
      latestGapBlock: [...previous.latestGapBlock, blockFromNumber]
    }));
    
    // remove from the list of gap blocks to check
    this.setState(previous => {
      // this underscore throws a console warning; wow
      const [_, ...rest] = previous.gapBlockNumsToCheck;
      return {
        gapBlockNumsToCheck: rest,
      };
    });

    // get action info
    const actionInfo = await this.getActionFromBlock(blockFromNumber);
    const blockAccount = {};
    blockAccount[blockFromNumber.header.height] = {
      blockHeight: blockFromNumber.header.height,
      blockHash: blockFromNumber.header.hash,
      account: {
        action: actionInfo.action,
        metadata: actionInfo.metadata
      }
    };
    if (actionInfo.action === 'CreateAccount') this.addNewBlockAccount(blockAccount[blockFromNumber.header.height]);    
  };
  
  // Called when we have a gap in the latest block and the latest checked block
  timedFetchGapBlocks = async () => {
    if (this.state.gapBlockNumsToCheck.length === 0) {
      // we've checked all the gap blocks, clear it
      this.setState({
        latestGapBlock: []
      })
    }
    
    // TODO: break this out into a function
    let firstFiveBlockNums = [];
    for (let i = 0; i < 5; i++) {
      if (this.state.gapBlockNumsToCheck.length > i + 1) {
        firstFiveBlockNums.push(this.state.gapBlockNumsToCheck[i])
      }
    }
    this.setState({
      humanReadableGapBlockNumsToCheck: firstFiveBlockNums
    });
    
    if (this.state.gapBlockNumsToCheck.length !== 0) {
      const firstGapBlock = this.state.gapBlockNumsToCheck[0];
      await this.fetchBlockNumber(firstGapBlock);
    }
    
    if (this.timerRange !== null) {
      const self = this;
      this.timerRange = setTimeout(() => {
        self.timedFetchGapBlocks()
      }, 500);
    }
  };

  fetchHistorical = async () => {
    if (this.state.recentBlocks.length === 0) {
      // This is the first time, fetch the latest
      let latestHash = (await this.props.provider.status()).sync_info.latest_block_hash;
      const latestBlock = await this.props.provider.block(latestHash);
      this.setState({
        recentBlocks: [latestBlock]
      });
      
      // get action info TODO: make function outta this
      const actionInfo = await this.getActionFromBlock(latestBlock);
      const blockAccount = {};
      blockAccount[latestBlock.header.height] = {
        blockHeight: latestBlock.header.height,
        blockHash: latestBlock.header.hash,
        account: {
          action: actionInfo.action,
          metadata: actionInfo.metadata
        }
      };
      
      if (actionInfo.action === 'CreateAccount') this.addNewBlockAccount(blockAccount[latestBlock.header.height]);      
    } else {
      const prevHashOfLatestBlock = this.state.recentBlocks[this.state.recentBlocks.length - 1].header.prev_hash;
      const previousBlock = await this.props.provider.block(prevHashOfLatestBlock);
      
      // check in case you're at the root node and doesn't already exist
      if (prevHashOfLatestBlock !== null) {
        this.setState(previous => {
          if (previous.recentBlocks.length >= this.maxAttemptsToShow) {
            previous.recentBlocks.splice(0, 1);
          }          
          return {
            recentBlocks: [...previous.recentBlocks, previousBlock]
          }
        });
        this.checkMaxBlockHeight(previousBlock.header.height);        
      }

      // get action info
      const actionInfo = await this.getActionFromBlock(previousBlock);
      const blockAccount = {};
      blockAccount[previousBlock.header.height] = {
        blockHeight: previousBlock.header.height,
        blockHash: previousBlock.header.hash,
        account: {
          action: actionInfo.action,
          metadata: actionInfo.metadata
        }
      };
      if (actionInfo.action === 'CreateAccount') this.addNewBlockAccount(blockAccount[previousBlock.header.height]);      
    }
  };
  
  timedFetchHistorical = async () => {
    await this.fetchHistorical();
    // console.log("Finished timed fetch historical");
    // Get previous blocks up to the limit maxIterations
    if (this.timerHistory !== null && this.state.currentIterations < this.maxIterations) {
      this.setState(prevState => {
        return {currentIterations: prevState.currentIterations + 1}
      });
      this.timerHistory = setTimeout(this.timedFetchHistorical, 250);
    }
  };

  render() {
    const { d3, recentBlocks, maxBlockHeightChecked, currentIterations, latestGapBlock, timeLastChecked, gapBlockNumsToCheck, humanReadableGapBlockNumsToCheck } = this.state;
    const doneFetchingHistoricalBlocks = currentIterations === this.maxIterations;
    const gapBlocksOverLimit = gapBlockNumsToCheck.length > this.maxGapBlockToShow;
    
    return (
      <div className="App-header">
        <div className="image-wrapper">
          <img className="logo" src={nearlogo} alt="NEAR logo" />
        </div>
        <StackedBarChart data={d3} divId="accounts-created-per-block"/>
        <div className="attempted-blocks">
          <p>Max block height checked: {maxBlockHeightChecked}</p>
          <div id="attempts-wrapper">
            <div id="attempts-backward">
              <p><strong>Backwards thru the ⛓</strong></p>
              <p>Travers{doneFetchingHistoricalBlocks ? 'ed': 'ing'} backward: {currentIterations}/{this.maxIterations} times</p>
              {
                recentBlocks.map((block) => {
                  return <AttemptingBlock key={block.header.height} height={block.header.height} hash={block.header.hash} />;
                })
              }
            </div>
            <div id="attempts-latest">
              <p><strong>Also checking recent blocks</strong></p>
              <p>Time last checked: {timeLastChecked}</p>
              {
                gapBlockNumsToCheck.length === 0 ? (
                  <p>Latest blocks checked.</p>
                ) : (
                  <p>Need to catch up to: {gapBlocksOverLimit ? humanReadableGapBlockNumsToCheck.join(', ') + '…' : gapBlockNumsToCheck.join(', ')}</p>
                )
              }
              {
                latestGapBlock.map((block) => {
                  return <AttemptingBlock key={block.header.height} height={block.header.height} hash={block.header.hash} />;
                })
              }              
            </div>
          </div>
        </div>
        <div>
          <p>Working on these gap blocks: {gapBlockNumsToCheck.length}</p>
        </div>
      </div>
    )
  }
}

export default App;