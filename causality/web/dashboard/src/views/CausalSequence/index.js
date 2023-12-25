import React, { Component } from 'react';
import { Select, Slider, Checkbox, Divider } from 'antd';
import './CausalSequence.css';

const { Option } = Select;

const CheckboxGroup = Checkbox.Group;

const plainOptions = ['Male', 'Female', 'Unknown'];
const defaultCheckedList = ['Male', 'Female', 'Unknown'];

export default class CausalSequence extends Component {

    constructor(props) {
        super(props);
        this.state = {
            checkedList: defaultCheckedList,
            indeterminate: true,
            checkAll: false,
        };
    }

    onChangeCheckbox = checkedList => {
        this.setState({
            checkedList,
            indeterminate: !!checkedList.length && checkedList.length < plainOptions.length,
            checkAll: checkedList.length === plainOptions.length,
        });
        this.props.changeIncludedGender(checkedList);
    };

    onCheckAllChange = e => {
        const checkedList = e.target.checked ? plainOptions : [];
        this.setState({
            checkedList: checkedList,
            indeterminate: false,
            checkAll: e.target.checked,
        });
        this.props.changeIncludedGender(checkedList);
    };

    onChangeSilder = value => {
        this.props.changeGreaterThenAge(value);
    }

    render() {
        return (
            <div id='CausalSequence' className='pane'>
                <div className='header'>Causal Sequences</div>

            </div>
        )
    }
}