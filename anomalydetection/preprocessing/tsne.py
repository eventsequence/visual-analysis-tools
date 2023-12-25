#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Feb 25 19:22:24 2019

@author: Adminstrator
"""

import json
import numpy as np
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA, KernelPCA
from sklearn.manifold import MDS
import pickle

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

def tsne():
    latent_vecs=json.load(open('data/latent_vector.json','r'))
    pids=list(latent_vecs.keys())
    vecs=[]
    scores=[]
    for pid in pids:
        vecs.append(latent_vecs[pid][0])
        scores.append(latent_vecs[pid][1])
    X = np.array(vecs)
    embedding = MDS(n_components=2)
    X_transformed = embedding.fit_transform(X)
    result={'pids':pids,'coords':list(X_transformed), 'scores':scores}
    
    return result
    
if __name__ == '__main__':
#    coords=tsne()
    latent_vecs=json.load(open('data/latent_vector.json','r'))
    select_id=json.load(open('data/select_id.json','r'))
    tsne_coords=json.load(open("../web/data/mimic/tsne.json",'r'))
    idx2label=json.load(open("data/idx2label.json",'r'))['idx2label']
    idx2type=json.load(open("../web/data/mimic/idx2type.json",'r'))
    data_query=pickle.load(open('data/data_query','rb'))
#    output_path="../web/data/mimic/tsne.json"
#    json.dump(coords,open(output_path,'w'),cls=MyEncoder)
    
#    sid=[]
#    for pid in select_id:
#        event=data_query[pid]['event']
#        event=[y for x in event for y in x]
#        if (141 in event or 85 in event):
#            sid.append(pid)
#            
#    json.dump(sid,open('data/sid.json','w'))
    
idx2type[155]='Medications'
idx2type[156]='Medications'
idx2type[128]='Medications'

json.dump({'idx2type':idx2type},open("../web/data/mimic/idx2type.json",'w'))
        
        