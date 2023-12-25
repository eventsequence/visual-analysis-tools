#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sun Jan 20 22:43:41 2019

@author: guoshunan
"""

import pickle
from tqdm import tqdm

distance=pickle.load(open('distance','rb'))
result=[]
for key,dat in tqdm(distance.items()):
    for _key,dis in dat.items():
        result.append([key,_key,dis['distance']])
        
pickle.dump(result,open('result','wb'))