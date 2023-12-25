import React, { Component } from 'react';
import data from './data';
import { Layout } from 'antd';
import QueryPanel from './views/QueryPanel';
import CausalSequence from './views/CausalSequence';
import CausalGraph from './views/CausalGraph';
import HistoryView from './views/HistoryView';
import ComparisonView from './views/ComparisonView';
import './dashboard.css';

const { Sider, Content } = Layout;

export default class Dashboard extends Component {

    constructor(props) {
        super(props);
        this.state = {
            selectedUser: data[0],
            greaterThenAge: 0,
            includedGender: ['Male', 'Female','Unknown'],
        }
    }

    changeSelectUser = value => {
        this.setState({
            selectedUser: value
        })
    }

    changeGreaterThenAge = value => {
        this.setState({
            greaterThenAge: value
        })
    }

    changeIncludedGender = value => {
        this.setState({
            includedGender: value
        })
    }

    render() {
        const {selectedUser, greaterThenAge, includedGender} = this.state;
        const filteredData = data.filter(user=>includedGender.indexOf(user.gender)!==-1)
                                 .filter(user=>user.age>greaterThenAge);
        return (
            <div id='interface'>
                <Layout style={{ height: 817, width: 1403 }}>
                    <Sider width={300} style={{backgroundColor:'#eee'}}>
                        <Content style={{ height: 805 }}>
                            <QueryPanel user={selectedUser}/>
                        </Content>
                        {/*<Content style={{ height: 300 }}>*/}
                        {/*    <PatientList data={filteredData}/>*/}
                        {/*</Content>*/}
                    </Sider>
                    <layout style={{width:800 }}>
                        <Content style={{ height: 350 }}>
                            <CausalSequence
                                changeGreaterThenAge={this.changeGreaterThenAge}
                                changeIncludedGender={this.changeIncludedGender}
                            />
                        </Content>
                        <Content style={{ height: 450 }}>
                                <CausalGraph user={selectedUser}/>
                        </Content>
                    </layout>
                    <Sider width={300} style={{backgroundColor:'#eee'}}>
                        <Content style={{ height: 350 }}>
                            <HistoryView data={filteredData}/>
                        </Content>
                        <Content style={{height:450}}>
                            <ComparisonView data={filteredData} changeSelectUser={this.changeSelectUser}/>
                        </Content>
                    </Sider>
                </Layout>
            </div>
        )
    }
}
