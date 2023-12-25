#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Thu Jun 20 10:32:15 2019

@author: guoshunan
"""
import json
import pickle
from tqdm import tqdm
import pandas as pd
from datetime import datetime
import time
import datetime as dt

def date2unix(x,timeformat):
    return time.mktime(dt.datetime.strptime(x,timeformat).timetuple())

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

def getEventDict():
    global idx2type
    idx2type=json.load(open(idx2type_path,"r"))
    global idx2label
    idx2label=json.load(open(idx2label_path,"r"))
    global idx2event
    idx2event=json.load(open(idx2event_path,"r"))
    global event2idx
    event2idx=json.load(open(event2idx_path,"r"))

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
    
    
#    for ab_pid in tqdm(ab_records):
#        output_datapath="../web/data/mimic/patient_data/"+ab_pid+".json"
#    #    ab_pid='51385'
#        abrecord=data_query[ab_pid]['event']
#        
#        #stage analysis
#        segresult=segStage(abrecord,1e-1)
#        
#        #calculate mean sequence
#        mean_seqs=json.load(open('data/mean.json','r'))
#        mean_seq=mean_seqs[ab_pid]
#        
#        #align normal records with abrecord
#        top_num=100
#    #    alignment=getAlignment(ab_pid)
#        alignment=getMeanSeqAlignment(mean_seq)
#        
#        latent_dist=pickle.load(open(distance_path,'rb'))
#        
#        
#        distances={'pids':[x['pid'] for x in alignment],
#                   'distance':[x['distance'] for x in alignment],
#                   'latent_dis':[latent_dist[ab_pid][x['pid']] for x in alignment]}
#        
#    #    for pid in ab_records:
#    #        abseq=data_query[pid]['event']
#    #        alignment[pid]=getAlignment(abseq)
#        
#        #output format for ONE patient
#        output_obj={"pid":ab_pid,
#                    "seqs":data_query[ab_pid],
#                    "alignment":alignment,
#                    "profile":profile[ab_pid],
#                    "distances":distances,
#                    "mean_seq":mean_seq,
#                    "stage":segresult}
#
#        json.dump(output_obj,open(output_datapath,'w'), cls=MyEncoder)
#        
#        del abrecord,segresult,mean_seqs,mean_seq,alignment,latent_dist,distances,output_obj
#        gc.collect()