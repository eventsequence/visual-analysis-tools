import React, { Component } from 'react';
import { List } from 'antd';
import './ComparisonView.css';

export default class ComparisonView extends Component {

    selectUser = (user) => {
        this.props.changeSelectUser(user);
    }

    render() {
        const {data} = this.props;
        return (
            <div id='ComparisonView' className='pane'>
                <div className='header'>Causal Comparison</div>
                {/*<List*/}
                {/*    size="small"*/}
                {/*    bordered*/}
                {/*    dataSource={data}*/}
                {/*    renderItem={user => <List.Item onClick = {() => this.selectUser(user)}>*/}
                {/*        <div>*/}
                {/*            {user.name + ':' + user.age}*/}
                {/*        </div>*/}
                {/*    </List.Item>}*/}
                {/*/>*/}
            </div>
        )
    }
}