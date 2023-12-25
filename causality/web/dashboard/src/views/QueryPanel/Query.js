import React, { Component } from 'react';
import { Avatar } from 'antd';
import './QueryPanel.css';

export default class Query extends Component {
    render() {
        let {shown} = this.props
        return (
            <div id='Query' style={{"display":shown}}>
                <div className={'info-view'}>
                    Key Events:
                </div>
                <div className={'info-view'}>
                    Gender:
                </div>
                <div className={'info-view'}>
                    Age:
                </div>
                <button id='queryBtn'>
                    Query
                </button>
            </div>
        )
    }
}