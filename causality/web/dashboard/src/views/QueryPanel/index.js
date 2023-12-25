import React, { Component } from 'react';
import { Avatar } from 'antd';
import './QueryPanel.css';
import Query from './Query'
import PatientList from "./PatientList";

export default class QueryPanel extends Component {

    constructor(props) {
        super(props);
        this.state = {
            tabs:[
                {tabName:"Query",id:1},
                {tabName:"PatientList",id:2},
            ],
            currentIndex:1,
        };
    };
    tabChoiced=(id)=>{
        this.setState({
            currentIndex:id
        });
    };
    render() {
        var _this=this;
        var isBox1Show=this.state.currentIndex==1 ? 'block' : 'none';
        var isbox2Show=this.state.currentIndex==2 ? 'block' : 'none';
        var tabList= this.state.tabs.map(function(res,index) {
            var tabStyle=res.id==this.state.currentIndex ? 'Tab active' : 'Tab';
            return   <div key={index} onClick={this.tabChoiced.bind(_this,res.id)} className={tabStyle}>{res.tabName}</div>
        }.bind(_this));
        return (
            <div id='QueryPanel' className='pane'>
                <div className='header query'>
                    {tabList}
                </div>
                <Query shown={isBox1Show}></Query>
                <PatientList shown={isbox2Show}></PatientList>
            </div>
        )
    }
}
