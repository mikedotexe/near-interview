import React from 'react';
import * as d3 from 'd3';

class StackedBarChart extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      blockHeightsDisplayed: ''
    }
  }
  
  componentDidMount() {
    this.drawChart();
  }
  
  // TODO: I had an assumption that since this component only receives
  // App.js's state.d3 object, that componentDidUpdate would only trigger on
  // changing that object. I would look into using hooks or useEffect
  componentDidUpdate() {
    // if there are new columns to render, build the chart
    if (this.state.blockHeightsDisplayed !== Object.keys(this.props.data).join()) {
      this.setState({
        blockHeightsDisplayed: Object.keys(this.props.data).join()
      });
      const svg = d3.select("#" + this.props.divId);
      // clear the chart before updating
      svg.selectAll("*").remove();
      this.drawChart();
    }
  };

  drawChart() {
    const margin = {top: 10, right: 30, bottom: 40, left: 50};
    const width = 460 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    const svg = d3.select("#" + this.props.divId)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    const data = this.props.data;
    const subgroups = Object.keys(data);

    // loop through data and: 
    //   1. get max accounts per block
    //   2. build an object keeping track of block and number of accounts
    //      (this will be used to decrement determining graph stack height)
    let maxAccounts = 0;
    let blockAccountTotals = {};
    Object.keys(data).forEach(blockHeight => {
      const datumLength = data[blockHeight].accounts.length;
      if (datumLength > maxAccounts) {
        maxAccounts = datumLength;
      }
      blockAccountTotals[blockHeight] = datumLength;
    });
    
    const blockHeights = d3.map(Object.values(data), function (d) {
      return (d.blockHeight)
    }).keys();

    // x axis
    const x = d3.scaleBand()
      .domain(blockHeights)
      .range([0, width])
      .padding([0.2]);
    svg.append("g")
      .attr("transform", "translate(0, " + height + ")")
      .call(d3.axisBottom(x));
    // label
    svg.append("text")
      .style("text-anchor", "middle")
      .attr("x", width / 2 )
      .attr("y",  height + 35)
      .text("block height");

    // y axis
    let y = d3.scaleLinear()
      .domain([0, maxAccounts])
      .range([height, 0]);
      d3.format("d");
    // make sure ticks are integers
    const yAxisTicks = y.ticks()
      .filter(tick => Number.isInteger(tick));
    const yAxis = d3.axisLeft(y)
      .tickValues(yAxisTicks)
      .tickFormat(d3.format('d'));
    svg.append("g")
      .call(yAxis);
    // label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("number of accounts");

    // NEAR brand colors
    const color = d3.scaleOrdinal()
      .domain(subgroups)
      .range(['#f0ec74', '#ff585d', '#24272a'])

    // Number of columns is number of unique blocks (ex: 4)

    // Number of rows is the maximum accounts per block (ex: 3)
    // each row has every account (ex: 7) 
    // each account has a height (ex: [0, 10] or [10, 20])
    // each account also has data: {} 
    
    let nearAccountsStackedData = [];
    for (let i = 0; i < maxAccounts; i++) {
      let nOfMaxAccounts = [];
      Object.keys(data).forEach(blockHeight => {
        if (blockAccountTotals[blockHeight] !== 0) {
          let colNofBlocks = [
            i,
            i + 1
          ];
          blockAccountTotals[blockHeight]--;
          colNofBlocks.data = data[blockHeight];
          nOfMaxAccounts.push(colNofBlocks);
        }
      });
      nOfMaxAccounts.index = i; // redundant? d3's stack() does it, i'll do it
      nOfMaxAccounts.blockIndex = i;
      nearAccountsStackedData.push(nOfMaxAccounts);
    }

    // Build the stacked bar rectangle svgs
    svg.append("g")
      .selectAll("g")
      // first data is number of accounts
      .data(nearAccountsStackedData)
      .enter().append("g")
      .attr("fill", function (d) {
        // alternate between the three NEAR brand colors
        return color(d.index % 3);
      })
      .selectAll("rect")
      // second data is for each column
      .data(function (d) {
        return d;
      })
      .enter().append("rect")
      .attr("x", function (d) {
        return x(d.data.blockHeight);
      })
      .attr("y", function (d) {
        return y(d[1]);
      })
      .attr("height", function (d) {
        return y(d[0]) - y(d[1]);
      })
      .attr("width", x.bandwidth())
      // provide click listener per account in this block
      .on("click", function (d) {
        const accountId = d.data.accounts[d[1] - 1].id;
        alert('Account added: ' + accountId);
      })
  }
  
  render() {
    const {divId} = this.props;
      return <div id={divId} />;
  }
}

export default StackedBarChart;