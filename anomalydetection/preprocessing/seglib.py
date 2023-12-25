#!/usr/bin/env python2
# -*- coding: utf-8 -*-
"""
Created on Thu Dec 21 14:50:02 2017

@author: Adminstrator
"""

import json
import numpy as np
from scipy.spatial.distance import cdist
from itertools import chain,tee
from sklearn.preprocessing import normalize

evec=[]
vocab=[]
sequences=[]

seqs_vec=[]
scores=[]

# with open('car.json','r') as f:
#     obj=json.load(f)
#     evec=obj['evec']
#     vocab=obj['vocab']
#     sequences=obj['sequence']

def genseqvec():
    for sequence in sequences:
        s_vec=[]
        for event in sequence:
            e_vec=evec[vocab.index(event)]
            s_vec.append(e_vec)
        seqs_vec.append(s_vec)

def segiter(splits):
    #splits s -> (s0,s1),(s1,s2),(s2,s3),...
    iterable = [0]+splits
    a,b = tee(iterable)
    next(b, None)
    return zip(a,b)
        

def gensigma(X, minlength = 1, maxlength = None, lam = 0.0):
    N,D = X.shape
    over_sqrtD = 1./np.sqrt(D)
    cs=np.cumsum(X,0)
    
    def sigma(a,b):
        length = (b-a)
        if minlength:
            if length < minlength: return np.inf
        if maxlength:
            if length > maxlength: return np.inf
            
        tot = cs[b-1].copy()
        if a>0:
            tot -= cs[a-1].copy()
        signs = np.sign(tot)
        return -over_sqrtD*((signs*tot).sum())
    
    return sigma 
    
def gensig_euclidean(X,minlength = 1,maxlength = None):
    cs = X.cumsum(0)
    css = (X**2).sum(1).cumsum(0)
    def sigma(i,j):
        length = (j-i)
        if minlength:
            if length<minlength : return np.inf
        if maxlength:
            if length>maxlength : return np.inf
        if i==0:
            return css[j-1] -1./j**((cs[j-1])**2).sum()
        else:
            return (css[j-1]-css[i-1]) - 1./(j-1) * ((cs[j-1] - cs[i-1])**2).sum()
    return sigma
    
def gensig_cosine(X,minlength = 1,maxlength = None):
    def sigma(a,b):
        length = (b-a)
        if minlength:
            if length<minlength : return np.inf
        if maxlength:
            if length>maxlength : return np.inf
        rep = X[a:b].mean(0)
        if length<2:
            return np.inf
        return(cdist(X[a:b],[rep],'cosine')**2).sum()
    return sigma
    
    
def dysegment(n,k,sig):
    K = k+1
    N = n
    segtable = np.zeros((n,K)) + np.nan
    segtable[:,0] = [sig(0,j+1) for j in range(N)]
    segindtable = np.zeros((N,K), dtype = 'int') - 1
    
    for k in range(1,K):
        for j in range(k,N):
            ans = min(((segtable[l,k-1] + sig(l+1,j+1), l+1) for l in range(k-1,j)))
            segtable[j,k] = ans[0]
            segindtable[j,k] = ans[1]
    
    current_pointer = segindtable[-1,K-1]
    path = [current_pointer]
    for k in range(K-2,0,-1):
        current_pointer = segindtable[current_pointer-1,k]
        path.append(current_pointer)
        
    return sorted(path + [N]),segtable[-1,K-1]


def greedyseg(n,k,sig,threshold):  
    splits=[n]  
    s=sig(0,n)
    
    def score(splits,sigma):
        splits = sorted(splits)            
        return sum(sigma(a,b) for (a,b) in segiter(splits))
        
    min_s=s
    score_max=score(splits,sig)
    score_dim_max=score_max-min((score(splits+[i],sig),splits+[i]) for i in range(1,n))[0]
    
    while k>0:
        
        usedinds = set(splits)
        new = min((score(splits+[i],sig),splits+[i]) for i in range(1,n) if i not in usedinds)
        s=new[0]
        
        if (min_s-s)*1.0/score_dim_max >= threshold:
            min_s=s
            splits=new[1]
        else:
            return sorted(splits), s
            
        k=k-1
        
    return sorted(splits), s


def bestsplit(low,high,sig,minlength=1,maxlength=None):
    #find best split between lowerbound and upperbound
    length = high - low
    if length < 2*minlength:
        return (np.inf,np.inf,low)
    
    best = min(((sig(low,j),sig(j,high),j) for j in range(low+1,high)), key = lambda x: x[0]+x[1])
    return best
    

def segrefine(splits,sig,n):
    oldsplits = splits[:]
    counter = 0
    n = n or np.inf
    while counter<n:
        splits = [0] + splits
        n = len(splits) - 2
        new = [splits[0]]
        for i in range(n):
            out = bestsplit(splits[i], splits[i+2], sig)
            new.append(out[2])
        new.append(splits[-1])
        splits = new[1:]

        if splits == oldsplits:
            return splits
            
        oldsplits = splits[:]
        counter = counter+1
    
    return splits



# genseqvec()

# with open('seq_vec.json','w') as f:
#     json.dump(seqs_vec,f)

# segmentation=[]
# for seq_vec in seqs_vec:
#     X=np.array(seq_vec)
#     N,D = X.shape
#     normed_X=normalize(X,axis=1,norm='l2')
#     l2_norm=normed_X
#     sum_vec=np.cumsum(normed_X,0)[N-1]
#     for n in range(0,N):
#         for d in range (0,D):
#             normed_X[n][d]=normed_X[n][d]-sum_vec[d]/N*1.0
#     sig=gensigma(normed_X)
#     splits,e=greedyseg(normed_X.shape[0],normed_X.shape[0]-1,sig)
#     resplits = segrefine(splits,sig,20)
#     segmentation.append(resplits)
    
# with open('segmentation.json','w') as f:
#     json.dump(segmentation,f)

#segmentation=[]
#for seq_vec in seqs_vec:
#    X=np.array(seq_vec)
#    N,D = X.shape
#    normed_X=normalize(X,axis=1,norm='l2')
#    l2_norm=normed_X
#    sum_vec=np.cumsum(normed_X,0)[N-1]
#    for n in range(0,N):
#        for d in range (0,D):
#            normed_X[n][d]=normed_X[n][d]-sum_vec[d]/N*1.0
#    sig=gensigma(normed_X)
#    splits,e=greedyseg(normed_X.shape[0],normed_X.shape[0]-1,sig)
#    resplits = segrefine(splits,sig,20)
#    segmentation.append(resplits)
#    
#with open('segmentation.json','w') as f:
#    json.dump(segmentation,f)

#X=np.array(seqs_vec[76])
#N,D = X.shape
#normed_X=normalize(X,axis=1,norm='l2')
#l2_norm=normed_X
#sum_vec=np.cumsum(normed_X,0)[N-1]
#for n in range(0,N):
#    for d in range (0,D):
#        normed_X[n][d]=normed_X[n][d]-sum_vec[d]/N*1.0
#sig=gensigma(normed_X)
#splits,e=greedyseg(normed_X.shape[0],normed_X.shape[0]-1,sig)
#resplits = segrefine(splits,sig,20)

