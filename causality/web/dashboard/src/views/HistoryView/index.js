import React, { Component } from 'react';
import BarChart from '../../charts/BarChart';
import './HistoryView.css';

export default class HistoryView extends Component {
    render() {
        const {data} = this.props;
        return (
            <div id='HistoryView' className='pane'>
                <div className='header'>Analysis History</div>
                {/*<div style={{ overflowX: 'scroll',overflowY:'hidden' }}>*/}
                {/*<BarChart data={data} width={1000} height={550}/>*/}
                {/*</div>                */}
            </div>
        )
    }
}