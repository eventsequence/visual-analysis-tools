import React, { Component } from 'react';
import './CausalGraph.css';
import LineChart from '../../charts/LineChart';

export default class CausalGraph extends Component {
    render() {
        const {user} = this.props,
              width = 1100,
              height = 250;
        return (
            <div id='CausalGraph' className='pane' >
                <div className='header'>Causal Model</div>
                <div>
                    <div id='Diagnose'>
                    </div>
                    <div>
                    </div>
                </div>
            </div>
        )
    }
}