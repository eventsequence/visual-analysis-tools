<template>
  <div id="profile-view" class="view">
    <div class="view-header" id="profile-view-header">
      <label>Profile</label>
      <div id="pid-group">
            <input type="text" id="pid-input" v-model="inputPid">
            <div id="pid-btn" @click="pidBtnClick">
                <img src="../../static/img/pid-btn.png" alt="pid-btn">
            </div>
            <div id="pidlist" style="display:none">
                <div class="pid-item" v-for="(pid, idx) in pidList" :key="idx" @click="selectPid(pid)">
                    <label v-text="pid"></label>
                </div>
            </div>
      </div>
    </div>
    <div class="view-body" id="profile-view-body">
      <div><img id="profile-pic" :src="this.picUrl" alt="patient face"></div>
      <ul>
        <li>
            <img class="pro-icon" src="../../static/img/person.png" alt="name">
            <label class="pro-label">{{name}}</label>
        </li>
        <li>
            <img class="pro-icon" src="../../static/img/gender.png" alt="gender">
            <label class="pro-label">{{gender}}</label>
        </li>
        <li>
            <img class="pro-icon" src="../../static/img/number.png" alt="hospital">
            <label class="pro-label">{{pid}}</label>
        </li>
        <li>
            <img class="pro-icon" src="../../static/img/cake.png" alt="age">
            <label class="pro-label">26</label>
        </li>
      </ul>
    </div>
  </div>
</template>
<script>
import { vaxios } from "../request-common";
export default {
    data() {
        return {
            pid: '99965',
            name: "",
            gender: "",
            picUrl: "",
            inputPid: "",
            pidList: [],
            pidVocab: []
        }
    },
    methods: {
        selectPid: function (pid) {
            console.log(pid)
            this.inputPid = pid;
            this.pid = pid;
            this.pidList = this.pidVocab;
            d3.select('#pidlist').style('display', 'none');
        },
        pidBtnClick: function () {
            let display = d3.select('#pidlist').style('display');
            if (display === 'none') {
                d3.select('#pidlist').style('display', 'block');
                this.pidList = this.pidVocab;
            }else  {
                d3.select('#pidlist').style('display', 'none');
            }
        }
    },
    watch: {
        inputPid: function (newInputPid, oldInputPid) {
            if (newInputPid !== '') {
                let newPidList = [];
                for (let item of this.pidVocab) {
                    if (String(item).indexOf(newInputPid)===0) newPidList.push(item)
                }
                this.pidList = newPidList;
            } else {
                this.pidList = this.pidVocab;
            }
        },
        pid: function (pid) {
            let picidx = Math.floor(Math.random() * 87)
            Hub.$emit('send-current-pid', pid, picidx)
            vaxios.get('/patientsinfo/'+pid+'.json')
            .then((res)=>{
                let gender = res.data['gender'];
                this.gender = gender=='M'? 'Male': 'Female';
                this.name = gender=='M'? 'Mike': 'Gina'
                this.picUrl = "../../static/lib/face/" + this.gender + "/" + ("000" + picidx).slice(-3) + gender.toLowerCase() + ".jpg"
            })
            .catch((err) => {
                console.log(err)
            })
        }
    },
    mounted(){

        vaxios.get('/pidlist')
        .then((res)=> {
            this.pidVocab = res.data.sort();
            console.log(this.pidVocab)
            this.pidList = this.pidVocab;
        })
        .catch((err)=> {
            console.log(err);
        })

        this.inputPid = this.pid;
        let picidx = Math.floor(Math.random() * 87)
        Hub.$emit('send-current-pid', this.pid, picidx)

        vaxios.get('/patientsinfo/'+this.pid+'.json')
        .then((res)=>{
            let gender = res.data['gender'];
            this.gender = gender=='M'? 'Male': 'Female';
            this.name = gender=='M'? 'Mike': 'Gina'
            this.picUrl = "../../static/lib/face/" + this.gender + "/" + ("000" + picidx).slice(-3) + gender.toLowerCase() + ".jpg"
        })
        .catch((err) => {
            console.log(err)
        })

    }
}
</script>
