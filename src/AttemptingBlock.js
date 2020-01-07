import React from 'react';

class AttemptingBlock extends React.Component {
  render() {
    return (
      <div className="attempting-block">
        <p>height: {this.props.height}</p>
        <p>hash: {this.props.hash}</p>
      </div>
    );
  }
}

export default AttemptingBlock;