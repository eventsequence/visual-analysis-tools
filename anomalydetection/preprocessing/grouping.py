#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sat Dec  8 18:28:44 2018

@author: Adminstrator
"""

import pickle
import pandas as pd
import math
import time
import datetime

mapping=pickle.load(open('mapping', 'rb'))

lab_fpath = '../../DAT/test'
treat_fpath = '../../DAT/treatment'

down_unicode = b'\xe2\x86\x93'
up_unicode = b'\xe2\x86\x91'

idx2id=mapping['idx2id']
act2idx=mapping['act2idx']
adid2id=mapping['adid2id']
aidx2type=mapping['aidx2type']
idx2act=mapping['idx2act']
idx2type=mapping['idx2type']
rid2idx=mapping['rid2idx']

        
def isnan(x):
    if isinstance(x,float) and math.isnan(x):
        return True
    else:
        return False
    
def date2unix(x,timeformat):
    return time.mktime(datetime.datetime.strptime(x,timeformat).timetuple())


events=[[] for x in range(0,len(idx2id))]
times=[[] for x in range(0,len(idx2id))]

#add admission and discharge event
patient_fpath = '../../DAT/patient.xlsx'
patient = pd.read_excel(patient_fpath)

for row in range(0,patient.shape[0]):
    in_date=patient.iat[row,29]
    out_date=patient.iat[row,34]
    pid=patient.iat[row,14]
    
    if not isnan(pid) and not isnan(in_date) and not isnan(out_date):
        pidx=rid2idx[pid]
        in_date=in_date.split(' ')[0]
        out_date=out_date.split(' ')[0]
        try:
            in_time=date2unix(in_date,'%Y-%m-%d')
            events[pidx].append(act2idx['ADMIT'])
            times[pidx].append(in_time)
        except:
            pass
        
        try:
            out_time=date2unix(out_date,'%Y-%m-%d')
            events[pidx].append(act2idx['DISCHARGE'])
            times[pidx].append(out_time)
        except:
            pass
        
#add lab test event
for fid in range(1,9):
    fpath=lab_fpath + '_' + str(fid) + '.xlsx'
    lab_dat=pd.read_excel(fpath)
    for row in range(0,lab_dat.shape[0]):
        t_adid=lab_dat.iat[row,0]
        t_type=lab_dat.iat[row,4]
        t_item=lab_dat.iat[row,5]
        t_result=lab_dat.iat[row,9]
        t_date=lab_dat.iat[row,2]
        
        if isnan(t_date) or isnan(t_adid):
            continue
        
        if isnan(t_type):
            entry = t_item
        elif isnan(t_item):
            entry = t_type
        else:
            entry= t_type + '-' + t_item
            
        if t_result.encode('utf-8')==up_unicode:
            entry+='-H'
        elif t_result.encode('utf-8')==down_unicode:
            entry+='-L'
            
        t_idx=act2idx[entry]
        pidx=adid2id[t_adid]
        t_date=t_date.split(' ')[0]
        try:
            t_time=date2unix(t_date,'%Y-%m-%d')
            events[pidx].append(t_idx)
            times[pidx].append(t_time)
        except:
            pass
        
        
#add treatment event
for fid in range(1,4):
    fpath=treat_fpath + '_' + str(fid) + '.xlsx'
    treat_dat = pd.read_excel(fpath)
    for row in range(0,treat_dat.shape[0]):
        treatment = treat_dat.iat[row,5]
        tr_date=treat_dat.iat[row,3]
        adid=treat_dat.iat[row,0]
        pidx=adid2id[adid]
        
        if isnan(tr_date) or isnan(adid):
            continue
        
        if not isnan(treatment):
            tr_idx=act2idx[treatment]
        else:
            continue
        
        try:
            tr_date=datetime.datetime.strptime(tr_date,'%Y%m%d%H:%M:%S')
            tr_date=tr_date.strftime('%Y-%m-%d')
            tr_time=date2unix(tr_date,'%Y-%m-%d')
            events[pidx].append(tr_idx)
            times[pidx].append(tr_time)
        except:
            pass
        
        
        
        
        
        

    
    
    
    
