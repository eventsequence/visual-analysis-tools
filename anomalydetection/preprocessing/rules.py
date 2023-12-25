#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Jan  7 21:16:54 2019

@author: Adminstrator
"""

import pandas as pd
import math

lab_fpath = '../../DAT/test'
treat_fpath = '../../DAT/treatment'

down_unicode = b'\xe2\x86\x93'
up_unicode = b'\xe2\x86\x91'

mapping={}
idx2

def isnan(x):
    if isinstance(x,float) and math.isnan(x):
        return True
    else:
        return False
    
def isNormal(x):
    if x.split('-')[-1]=='H' or x.split('-')[-1]=='L':
        return False
    else:
        return True

#read labtest    
for fid in range(1,9):
    fpath=lab_fpath + '_' + str(fid) + '.xlsx'
    lab_dat=pd.read_excel(fpath)
    for row in range(0,lab_dat.shape[0]):
        t_type=lab_dat.iat[row,4]
        t_item=lab_dat.iat[row,5]
        t_result=lab_dat.iat[row,9]
        if isnan(t_type):
            continue
        elif isnan(t_item):
            entry = t_type
        else:
            entry= t_type + '-' + t_item
        if t_result.encode('utf-8')==up_unicode:
            entry+='-H'
        elif t_result.encode('utf-8')==down_unicode:
            entry+='-L'
        
        mapping[entry]=t_type+isNormal?'-N':'-A'

        if entry not in idx2lab:
            idx2lab.append(entry)
            act2idx[entry]=len(idx2act)-1
            aidx2type.append(1)