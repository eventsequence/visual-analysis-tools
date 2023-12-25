import numpy as np
import cPickle as pickle
from sklearn.cluster import spectral_clustering
import json


mat = np.array(pickle.load(open("data/mimic.mat")))
mat = np.log(mat+1)

label = spectral_clustering(affinity = mat,n_clusters = 8)
print label
label = label.tolist()
with open("label.json","wb") as f:
    json.dump(label,f)
# print np.where(label == 6)
# print label
# matnew = np.zeros((len(idx),len(idx)))
# matnew = mat[idx][idx]
# print idx

