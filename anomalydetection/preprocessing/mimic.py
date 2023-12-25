#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Tue Jan  8 15:41:10 2019

@author: Adminstrator
"""
import sys
sys.path.append('./analysis')

import pandas as pd
import pickle 
import time
import datetime as dt
from datetime import datetime

import matplotlib.pyplot as plt
import numpy as np

import itertools
import copy

import json
import random

from gensim.models import Word2Vec

from scipy.spatial.distance import euclidean
from sklearn.preprocessing import normalize
from lib.fastdtw_ import fastdtw

from tqdm import tqdm

from seglib import gensigma,greedyseg,segrefine

import gc

class MyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        else:
            return super(MyEncoder, self).default(obj)

def date2unix(x,timeformat):
    return time.mktime(dt.datetime.strptime(x,timeformat).timetuple())

def calSeqLen(lenlist):
    seq_len=sorted(lenlist)
    seq_len_uniq=list(set(seq_len))
    
    plot_dat=[]
    for x in seq_len_uniq:
        num=len([i for i in seq_len if i==x])
        plot_dat.append((x,num))
        
    labels, ys = zip(*plot_dat)
    xs = np.arange(len(labels))
    width = 1
    
    plt.figure(figsize=(30,5))
    plt.bar(xs, ys, width, align='center')
    
    plt.xticks(xs, labels) #Replace default x-ticks with xs, then replace xs with labels
    plt.yticks(ys)
    
    plt.savefig('seq_len.png')
    
def calEventTypes(data):
    events=[]
    for pid,dat in data.items():
        for g in dat['event']:
            events+=g
    return events

def calTfidf(data):
    p_num=len(data.keys())  
    seq_all=[]
    tfidf={eid:[{},""] for eid,etype in idx2type.items()}  #eid:[{pid:tf-score},idf-score]
    for pid,dat in data.items():
        seq=list(itertools.chain.from_iterable(dat['event']))
        seq_all.append(seq)
        for event in list(set(seq)):
            tf=seq.count(event)/len(seq)
            tfidf[event][0][pid]=tf
    for eid in idx2type.keys():
        nums=len([x for x in seq_all if eid in x])
        if nums>0:
            idf=p_num/nums
            tfidf[eid][1]=idf
    
    #cal final score
    for eid, scores in tfidf.items():
        if len(scores[0].items()) and scores[1]!="":
            tf_avg=sum(scores[0].values())/len(scores[0].values())
            tfidf[eid]=tf_avg*np.log10(scores[1])
        else:
            tfidf[eid]=0
    
    return tfidf

def generateProfile():
    patients=pd.read_csv(patient_path)
    profile={}
    for row in range(0,patients.shape[0]):
        pid=patients.iat[row,0]
        gender=patients.iat[row,1]
        birthday=patients.iat[row,2]
        try:
            birthday=date2unix(birthday.split(" ")[0],"%Y-%m-%d")
        except OverflowError:
            date=birthday.split(" ")[0]
            year=int(date.split("-")[0])
            month=int(date.split("-")[1])
            day=int(date.split("-")[2])
            epoch = datetime(1970, 1, 1)
            t = datetime(year, month, day)
            t_diff=t-epoch
            birthday=t_diff.total_seconds()
            
        profile[str(pid)]={"gender":gender,"birthday":birthday}
    return profile
    
def generateSeq():
#    corpus = pd.read_csv(corpus_path,header=None)
    
#    dat=pd.read_csv(event_path,header=None)
    dat=pd.read_csv(event_path)
    for row in range(0,dat.shape[0]):
        pid=str(dat.iat[row,0])
#        timestamp=date2unix(dat.iat[row,1],'%Y-%m-%d %H:%M:%S')
        timestamp=date2unix(dat.iat[row,1].split(" ")[0],"%Y-%m-%d")
    #    timestamp=date2unix(dat.iat[row,1],'%Y-%m')
        eid=dat.iat[row,2]
        if pid not in dat_all.keys():
            dat_all[pid]={'event':[],'time':[]}
#        if idx2type[eid]=='diagnose':
        dat_all[pid]['event'].append(eid)
        dat_all[pid]['time'].append(timestamp)
    
    #sort
    for pid,seq in dat_all.items():
        events=seq['event']
        times=seq['time']
        z_time, z_event = zip(*[(x, y) for x, y in sorted(zip(times, events))])
        
        z_event=list(z_event)
        z_time=list(z_time)
        
        event_final=[]
        time_final=[]
        idx=0
        for j in range(1,len(z_time)):
            if z_time[j]==z_time[j-1]:
                continue
            else:
                event_final.append(z_event[idx:j])
                time_final.append(z_time[idx:j])
                idx=j
        dat_all[pid]['event']=event_final
        dat_all[pid]['time']=time_final
        
def filterEvents():
    
    #preliminary filter
    data_filter={pid:dat for pid,dat in dat_all.items() if len(dat["event"])>2}
    
    #filter event
    global tfidf
    tfidf=calTfidf(data_filter)
    tfidf_val=sorted([x for key,x in tfidf.items()])
    val_min=tfidf_val[100]
    global select_e
    select_e=[x for x in tfidf.keys() if tfidf[x]>val_min]  
    
    #filter data
    for pid,dat in data_filter.items():
        for i in range(0,len(dat['event'])):
            seq_event=dat['event'][i]
            seq_time=dat['time'][i]
            filter_zipp = [(x,y) for x,y in zip(seq_event,seq_time) if x in select_e]
            if len(filter_zipp):
                f_event,f_time=zip(*filter_zipp)
                data_filter[pid]['event'][i]=list(f_event)
                data_filter[pid]['time'][i]=list(f_time)
            else:
                data_filter[pid]['event'][i]=[]
                data_filter[pid]['time'][i]=[]
    data_filter={pid:dat for pid,dat in data_filter.items() if len(list(itertools.chain.from_iterable(dat['event'])))>0}
    for pid,dat in data_filter.items():
        dat['event']=[x for x in dat['event'] if len(x)]
        dat['time']=[x for x in dat['time'] if len(x)]
    
    #filter data 
    data_query = {pid: dat for pid,dat in data_filter.items() if len(dat['event'])>2}
    
#    data_vis=copy.deepcopy(data_query)
#    #cut sequence
#    for pid,dat in data_vis.items():
#        dat['event']=dat['event'][:25]
#        dat['time']=dat['time'][:25]
        
#    return data_query,data_vis
    return data_query

def calEventVector():
    seqs=[]
    for pid,dat in dat_all.items():
        seqs.append(np.array([str(x) for x in list(itertools.chain.from_iterable(dat['event']))]))
    
    model=Word2Vec(min_count=1)
    model.build_vocab(seqs)
    model.train(seqs,total_examples=model.corpus_count,epochs=model.iter)
    wv={}
    for (event,vector) in zip(model.wv.index2word,model.wv.syn0):
        wv[event]=vector
    return wv

def calAnomaly(obj):
    data=copy.deepcopy(obj)
    for pid,dat in data.items():
        ab_events=[]
        flag=0
        for i in range(0,len(dat['event'])):
            abn=[]
            for j in range(0,len(dat['event'][i])):
                ran=random.random()
                if(ran>0.9):
                    abn.append(random.random())
                    data[pid]['abnormal']=1
                    flag=1
                else:
                    abn.append(0)
            ab_events.append(abn)
        data[pid]['ab_events']=ab_events
        if flag==0:
            data[pid]['abnormal']=0
    return data

def calSeqVector(seq):
    result=[]
    for egroup in seq:
        vecs=[]
        for e in egroup:
            e_str=str(e)
            vecs.append(wv[e_str])
        result.append(np.mean(vecs,axis=0))
    return result

def calOnehotSeqVec(seq):
    result=[]
    for egroup in seq:
        vecs=[0]*len(idx2event)
        for e in egroup:
            e_str=str(e)
            e_idx=event2idx[e_str]
            vecs[e_idx]=1
        result.append(vecs)
    return result

def alignSeq(abseq,seq):
    abseq_vec=calSeqVector(abseq)
    seq_vec=calSeqVector(seq)
    distance,path,path_dis=fastdtw(abseq_vec,seq_vec,dist=euclidean)
    path=[[x,y] for (x,y) in path]
    return distance,path,path_dis

def getAlignment(abpid):#get all alignment for normal sequences given an abnormal sequence
    abseq=data_query[abpid]['event']
    distances=[]
    
    pid_arr=[]
    dis_arr=[]
    path_arr=[]
    path_dis_arr=[]
    
    for pid,dat in data_query.items():
        if pid==abpid:
            continue
        events=dat['event']
        distance,path,path_dis=alignSeq(abseq,events)
        
        pid_arr.append(pid)
        dis_arr.append(distance)
        path_arr.append(path)
        path_dis_arr.append(path_dis)

    sort_arr=sorted(zip(pid_arr,dis_arr, path_arr, path_dis_arr),key=lambda x: x[1])
    pid_arr,dis_arr,path_arr,path_dis_arr = zip(*[(p,x,y,z) for p,x,y,z in sort_arr])
    
    for i in range(0,len(pid_arr)):
        pid=list(pid_arr)[i]
        distance=list(dis_arr)[i]
        path=list(path_arr)[i]
        path_dis=list(path_dis_arr)[i]
        distances.append({"pid":pid,"seq":data_query[pid],"distance":distance,"path":path,"path_dis":path_dis})
    
    return distances

def getMeanSeqAlignment(mean_seq):#align all normal sequences to mean sequence
#    mean_vec=calMeanSeqVec(mean_seq)
    distances=[]
    
    pid_arr=[]
    dis_arr=[]
    path_arr=[]
    path_dis_arr=[]
    
    for pid in n_records:
        dat=data_query[pid]
        events=dat['event']
        global seq_vec
        seq_vec=calOnehotSeqVec(events)
        distance,path,path_dis=fastdtw(mean_seq,seq_vec,dist=euclidean)
        path=[[x,y] for (x,y) in path]
        
        pid_arr.append(pid)
        dis_arr.append(distance)
        path_arr.append(path)
        path_dis_arr.append(path_dis)
    
    sort_arr=sorted(zip(pid_arr,dis_arr, path_arr, path_dis_arr),key=lambda x: x[1])
    pid_arr,dis_arr,path_arr,path_dis_arr = zip(*[(p,x,y,z) for p,x,y,z in sort_arr])
    
    for i in range(0,len(pid_arr)):
        pid=list(pid_arr)[i]
        distance=list(dis_arr)[i]
        path=list(path_arr)[i]
        path_dis=list(path_dis_arr)[i]
        
        tmp=[0]+path_dis
        path_dis_upt=[tmp[i]-tmp[i-1] for i in range(1,len(tmp))]
        
        dist_group=[[] for x in range(0,len(mean_seq))]
        for pair in path:
            dist_group[pair[0]].append(path_dis_upt[pair[1]])
        dist=[np.mean(x,axis=0) for x in dist_group]
        dist_sum=np.sum(dist)
        
        distances.append({"pid":pid,"seq":data_query[pid],"distance":dist_sum,"path":path,"path_dis":path_dis})
        
    return distances

def calEventDict():
    global idx2type
    idx2type={}
    global idx2code
    idx2code={}
    global idx2label
    idx2label={}
    corpus = pd.read_csv(corpus_path)
    labels = pd.read_csv(label_path)
    code2label={}
    
    for row in range(0,labels.shape[0]):
        ecode=labels.iat[row,0]
        label=labels.iat[row,1]
        code2label[ecode]=label
        
    for row in range(0,corpus.shape[0]):
        eid=corpus.iat[row,0]
        etype=corpus.iat[row,2]
        ecode=corpus.iat[row,1]
        idx2type[eid]=etype
        idx2code[eid]=ecode
        idx2label[eid]=code2label[ecode]
        
    types=[""]*(len(idx2type.keys())+1)
    for idx,typ in idx2type.items():
        types[idx]=typ
    json.dump({"idx2type":types},open(idx2type_path,'w'),cls=MyEncoder)
    
    labels=[""]*(len(idx2label.keys())+1)
    for idx,label in idx2label.items():
        labels[idx]=label
    json.dump({"idx2label":labels},open(idx2label_path,'w'),cls=MyEncoder)
    
def getEventDict():
    global idx2type
    idx2type=json.load(open(idx2type_path,"r"))
    global idx2label
    idx2label=json.load(open(idx2label_path,"r"))
    global idx2event
    idx2event=json.load(open(idx2event_path,"r"))
    global event2idx
    event2idx=json.load(open(event2idx_path,"r"))
    
def calDistances():
    distances={}
    for key,dat in tqdm(data_query.items()):
        focal_seq=dat['event']
        distances[key]={}
        for _key,_dat in data_query.items():
            if _key==key:
                distances[key][_key]=0
                continue
            elif _key in distances.keys():
                distances[key][_key]=distances[_key][key]
                continue
            else_seq=_dat['event']
            dis,path,path_dis=alignSeq(focal_seq,else_seq)
            distances[key][_key]={'distance':dis,'path':path,'path_dis':path_dis}
    pickle.dump(distances,open('distances','wb'))
    return distances

def calMeanSeqVec(mean_seq):
    result=[]
    for egroup in mean_seq:
        avg_vec=[]
        for idx,eprop in enumerate(egroup):
            e=idx2event[idx]
            evec=wv[str(e)]
            avg_vec.append(eprop*evec)
        result.append(np.sum(avg_vec,axis=0)/np.sum(egroup))
    return result

def segStage(ab_seq,threshold):
    abseq_vec=calSeqVector(ab_seq)
    X=np.array(abseq_vec)
    N,D=X.shape
    normed_X=normalize(X,axis=1,norm='l2')
    sum_vec=np.cumsum(normed_X,0)[N-1]
    for n in range(0,N):
        for d in range(0,D):
            normed_X[n][d]=normed_X[n][d]-sum_vec[d]/N*1.0
    sig=gensigma(normed_X)
    splits,e=greedyseg(normed_X.shape[0],normed_X.shape[0]-1,sig,threshold)
    resplits=segrefine(splits,sig,20)
    
    print("Number of Stages:"+str(len(resplits)))
    
    return resplits

if __name__ == '__main__':
    
    #input paths
    event_path='../../MIMIC_DAT/connect.csv'
    patient_path = '../../MIMIC_DAT/patient.csv'
    corpus_path='../../MIMIC_DAT/event.csv'
    label_path='../../MIMIC_DAT/label.csv'
    distance_path='data/distances'
    
    #temp path
    #idx2event for mean sequence
    idx2event_path="data/idx2event.json"
    event2idx_path="data/event2idx.json"
    
    #output paths
    idx2type_path="../web/data/mimic/idx2type.json"
    idx2label_path="../web/data/mimic/idx2label.json"
#    output_datapath="../web/data/data.json"
    
#    calEventDict()
    getEventDict()
    
    global dat_all
    dat_all={}
    
    global profile
    
    profile=generateProfile()
#    generateSeq()
    
    print("generate seq done")
    
    global wv
#    wv=calEventVector()
#    pickle.dump(wv,open('data/wv','wb'))
    wv=pickle.load(open('data/wv','rb'))
#    
    print("generate wv done")
    
#    data_query=filterEvents()
#    pickle.dump(data_query,open('data/data_query','wb'))
    data_query=pickle.load(open('data/data_query','rb'))
    
    print("filter seq done")
    
#    distances=calDistances()
    
#    sythetic anomalies
#    data_query=calAnomaly(data_query)
    
    global ab_records
    ab_records=json.load(open('data/select_id.json','r'))
    global n_records
    n_records=[x for x in data_query.keys() if x not in ab_records]
    
    
    #select one ab_record
    for ab_pid in tqdm(ab_records):
        output_datapath="../web/data/mimic/patient_data/"+ab_pid+".json"
    #    ab_pid='51385'
        abrecord=data_query[ab_pid]['event']
        
        #stage analysis
        segresult=segStage(abrecord,1e-1)
        
        #calculate mean sequence
        mean_seqs=json.load(open('data/mean.json','r'))
        mean_seq=mean_seqs[ab_pid]
        
        #align normal records with abrecord
        top_num=100
    #    alignment=getAlignment(ab_pid)
        alignment=getMeanSeqAlignment(mean_seq)
        
        latent_dist=pickle.load(open(distance_path,'rb'))
        
        
        distances={'pids':[x['pid'] for x in alignment],
                   'distance':[x['distance'] for x in alignment],
                   'latent_dis':[latent_dist[ab_pid][x['pid']] for x in alignment]}
        
    #    for pid in ab_records:
    #        abseq=data_query[pid]['event']
    #        alignment[pid]=getAlignment(abseq)
        
        #output format for ONE patient
        output_obj={"pid":ab_pid,
                    "seqs":data_query[ab_pid],
                    "alignment":alignment,
                    "profile":profile[ab_pid],
                    "distances":distances,
                    "mean_seq":mean_seq,
                    "stage":segresult}

        json.dump(output_obj,open(output_datapath,'w'), cls=MyEncoder)
        
        del abrecord,segresult,mean_seqs,mean_seq,alignment,latent_dist,distances,output_obj
        gc.collect()

    
