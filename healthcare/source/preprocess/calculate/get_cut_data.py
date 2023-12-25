import sys
from scipy.spatial.distance import euclidean
import numpy as np
import json
# from fastdtw import fastdtw
import copy
import os
import multiprocessing

if __name__=="__main__":
    path = '../data/sequences_all/'
    files = os.listdir(path)
    patient_set = {}

    pid_list = []

    for file in files:
        print file
        if file != '.DS_Store':
          with open(path + file, 'r') as f:
              patient = json.load(f)
              pid_list.append(patient['pid'])
              patient_set[patient['pid']] = patient['seq']

    with open("../cut_spark/data/p_all.json",'wb') as f:
        json.dump(patient_set, f)

    with open("../cut_spark/data/p_list.json",'wb') as f:
        json.dump(pid_list,f)

    print 'load_finish!!'

    # with open('./data/vectors.json', 'r') as f:
    #     json_obj = json.load(f)
    #     global vocab
    #     vocab = json_obj['vocab']
    #     global evec
    #     evec=json_obj['evec']
    #
    # cut_set = {}
    #
    # for y in pool.imap(calculate_cut, pid_list[0:1]):
    #     cut_set[y['pid']] = y['cut']
    #
    # pool.close()
    # pool.join()
    #
    # with open('./data/cut_index.json', 'w') as f:
    #     json.dump(cut_set,f)




