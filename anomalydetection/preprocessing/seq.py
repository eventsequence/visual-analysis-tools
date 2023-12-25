#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sun Dec  9 13:50:00 2018

@author: guoshunan
"""

import pickle
import numpy as np                                                               
import matplotlib.pyplot as plt  
import itertools

events=pickle.load(open('events', 'rb'))
times=pickle.load(open('times','rb'))
mapping=pickle.load(open('mapping','rb'))

z_events=[[] for x in range(0,len(events))]
z_times=[[] for x in range(0,len(times))]

for i in range(0,len(events)):
    if len(events[i]) and len(times[i]):
        z_time, z_event = zip(*[(x, y) for x, y in sorted(zip(times[i], events[i]))])
        z_events[i]=list(z_event)
        z_times[i]=list(z_time) 
    else:
        continue
    
#group events with same timestamp
seq_final=[[]for x in range(0,len(z_events))]
time_final=[[]for x in range(0,len(z_times))]
for i in range(0,len(z_times)):
    times=z_times[i]
    idx=0
    for j in range(1,len(times)):
        if times[j]==times[j-1]:
            continue
        else:
            seq_final[i].append(z_events[i][idx:j])
            time_final[i].append(z_times[i][idx:j])
            idx=j
            
#get statistics
#seq_len = sorted([len(x) for x in seq_final])
#seq_len_uniq=list(set(seq_len))
#plot_dat=[]
#for x in seq_len_uniq:
#    num=len([i for i in seq_len if i==x])
#    plot_dat.append((x,num))
#    
#labels, ys = zip(*plot_dat)
#xs = np.arange(len(labels)) 
#width = 1
#
#plt.figure(figsize=(30,5))
#plt.bar(xs, ys, width, align='center')
#
#plt.xticks(xs, labels) #Replace default x-ticks with xs, then replace xs with labels
#plt.yticks(ys)
#
#plt.savefig('seq_len.png')

#admission
seq_span=[list(itertools.chain.from_iterable(a)) for a in seq_final]
seq_admit=[len([i for i in x if i==0]) for x in seq_span]
seq_admit_uniq = list(set(seq_admit))
admit_dat=[]
for x in seq_admit_uniq:
    num=len([i for i in seq_admit if i==x])
    admit_dat.append([x,num])
    
labels, ys = zip(*admit_dat)
xs = np.arange(len(labels)) 
width = 1

plt.figure(figsize=(15,5))
plt.bar(xs, ys, width, align='center')

plt.xticks(xs, labels) #Replace default x-ticks with xs, then replace xs with labels
plt.yticks(ys)

plt.savefig('admit_times.png')


    

