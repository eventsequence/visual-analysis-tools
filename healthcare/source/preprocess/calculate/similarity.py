import gensim
import sys, json
from scipy.spatial.distance import euclidean
import numpy as np

def generateQueryVec(allpatients):
    sentences=[]
    for patient in allpatients:
        events = patient['code_string'].split('|')
        sentences.append(events)
    model = gensim.models.Word2Vec(sentences, min_count=1)

    global vocab
    vocab = list(model.wv.vocab)
    X=model[vocab]
    global evec
    evec=X.tolist()

    json_obj={'evec':evec,
            'vocab':vocab}
    with open('../../data/vectors.json', 'w') as f:
        json.dump(json_obj, f)
    return json_obj

if __name__=="__main__":
    with open('../../data/allpatients.json', 'r') as f:
        allpatients = json.load(f)
    generateQueryVec(allpatients)
