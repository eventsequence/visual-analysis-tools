#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Thu Jun 20 11:57:42 2019

@author: guoshunan
"""

import numpy as np
from collections import defaultdict
import itertools
from bisect import bisect

import json
data=json.load(open('data/data_all.json','r'))
#sample_seq1=data['31585']['event']
#sample_seq2=data['79168']['event']

sample_seq1=[['a'],['b'],['e'],['c','d']]
sample_seq2=[['b'],['a'],['c','d'],['e']]

def _check_type(s):
    if not isinstance(s, str):
        raise TypeError('expected str or unicode, got %s' % type(s).__name__)
        
def dl_distance_seq(seq1,seq2):#seq1:source seq2:target
    #seq: 2-d array with event co-occurrence      
    seq1_flat=list(itertools.chain(*seq1))
    seq2_flat=list(itertools.chain(*seq2))
    
    seq1_index=[0]
    seq2_index=[0]
    cur_idx=0
    for egroup in seq1:
        cur_idx+=len(egroup)
        seq1_index.append(cur_idx)
        
    cur_idx=0
    for egroup in seq2:
        cur_idx+=len(egroup)
        seq2_index.append(cur_idx)
        
    value1=len(seq1_flat)
    value2=len(seq2_flat)
    
    infinite=value1+value2
    da=defaultdict(int)
    
    score=[[0]*(value2+2) for x in range(value1+2)]
    operations=[['']*(value2+2) for x in range(value1+2)]
    ops=['s','d','a','t']
    
    score[0][0]=infinite
    
    for i in range(0,value1+1):
        score[i+1][0]=infinite
        score[i+1][1]=i
    for i in range(0,value2+1):
        score[0][i+1]=infinite
        score[1][i+1]=i
        
    for i in range(1,value1+1):
        db=0
        for j in range(1,value2+1):
            i1=da[seq2_flat[j-1]]
            j1=db
            cost=1#?
            if seq1_flat[i-1]==seq2_flat[j-1]:
                cost=0
                db=j
            
            costs=[score[i][j] + cost,
                   score[i+1][j] + 1,
                   score[i][j+1] + 1,
                   score[i1][j1] + (bisect(seq1_index,i-1)-bisect(seq1_index,i1-1)-1) + 1 + (bisect(seq2_index,j-1)-bisect(seq2_index,j1-1)-1)
                   ]
            
            min_idx=np.argmin(costs)
            if(min_idx)==0 and cost==0:
                operations[i+1][j+1]='n'
            elif min_idx<3:
                operations[i+1][j+1]=ops[min_idx]
            else:
                operations[i+1][j+1]=('t',[i1,j1])
            score[i+1][j+1]=costs[min_idx]
            
        da[seq1_flat[i-1]]=i
        
    return score,operations
        
        
def damerau_levenshtein_distance(s1, s2):#s1: source s2:target
    _check_type(s1)
    _check_type(s2)

    len1 = len(s1)
    len2 = len(s2)
    infinite = len1 + len2

    # character array
    da = defaultdict(int)

    # distance matrix
    score = [[0]*(len2+2) for x in range(len1+2)]
    operations=[['']*(len2+2) for x in range (len1+2)]
    ops=['s','a','d','t']

    score[0][0] = infinite
    for i in range(0, len1+1):
        score[i+1][0] = infinite
        score[i+1][1] = i
    for i in range(0, len2+1):
        score[0][i+1] = infinite
        score[1][i+1] = i

    for i in range(1, len1+1):
        db = 0
        for j in range(1, len2+1):
            i1 = da[s2[j-1]]
            j1 = db
            cost = 1
            if s1[i-1] == s2[j-1]:
                cost = 0
                db = j
                
            values=[score[i][j] + cost,
                    score[i+1][j] + 1,
                    score[i][j+1] + 1,
                    score[i1][j1] + (i-i1-1) + 1 + (j-j1-1)]
            
            min_idx=np.argmin(values)
            if min_idx== 0 and cost == 0:
                operations[i+1][j+1] = 'n'
            elif min_idx<3:
                operations[i+1][j+1] = ops[min_idx]
            else:
                operations[i+1][j+1] = ('t',[i1,j1])
            score[i+1][j+1] = values[min_idx]
        da[s1[i-1]] = i

    return score, operations

cost_matrix, operation_matrix = dl_distance_seq(sample_seq1,sample_seq2)
#cost_matrix, operation_matrix = damerau_levenshtein_distance('abecd','bacde')


    
    
