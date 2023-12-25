import sys
from scipy.spatial.distance import euclidean
import numpy as np
import json
from fastdtw import fastdtw
import copy


def cut_patient(cur_seq, sim_set):
  sankey_out = {}
  data_all = {}
  seqvec_all = []
  cur_vec = []

  for event in cur_seq:
    event_str = event['event_code']
    index = vocab.index(str(event_str))
    cur_vec.append(evec[index])

  for pid, seq in sim_set.items():
    data_all[pid] = {}
    seq_vec = []
    seq_vec_slide = []
    for i, event in enumerate(seq):
      event_str = event['event_code']
      index = vocab.index(event_str)
      if (event['event_type'] == 'diagnose' and len(seq_vec) != 0):
        seq_vec_slide.append({'index': i, "seq_vec": copy.deepcopy(seq_vec)})

      seq_vec.append(evec[index])
      if i == len(seq) - 1:
        seq_vec_slide.append({'index': i + 1, "seq_vec": copy.deepcopy(seq_vec)})

    data_all[pid]['seq_vec'] = copy.deepcopy(seq_vec)
    data_all[pid]['sequence'] = copy.deepcopy(seq)
    data_all[pid]['seq_vec_slide'] = copy.deepcopy(seq_vec_slide)

  cut_patient = {}

  for pid, data in data_all.items():
    min_distance = 10000000000000000
    cut_index = -1

    for seq in reversed(data['seq_vec_slide']):
      distance, path = fastdtw(cur_vec, seq["seq_vec"], dist=euclidean)
      if min_distance >= distance:
        if seq['index'] != 1:
          cut_index = seq['index']
          min_distance = distance
        continue
      else:
        break

    data_all[pid]['cut_index'] = cut_index
    data_all[pid]['min_distance'] = min_distance
    cut_patient[pid] = cut_index
    # print 'cut'
    # print cut_index
    # print len(data_all[pid]['sequence'])
  return cut_patient

if __name__=="__main__":

    with open('data/vectors.json', 'r') as f:
        json_obj = json.load(f)
        global vocab
        vocab = json_obj['vocab']
        global evec
        evec=json_obj['evec']

    with open('../../data/allpatients.json', 'r') as f:
        all_patients = json.load(f)
