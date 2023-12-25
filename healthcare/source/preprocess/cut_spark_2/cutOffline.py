
from scipy.spatial.distance import euclidean
from pyspark import SparkContext, SparkConf
from pyspark.sql.functions import udf
from pyspark.sql.types import *
import fastdtw
import json
import copy

def get_slide(patient):
    result = {}
    pid = patient[0]
    seq = patient[1]
    seq_vec = []
    seq_vec_slide = []
    for i, event in enumerate(seq):
      event_str = event['event_code']
      index = vocab.index(str(event_str))
      print event['event_type']
      if (event['event_type'] == 'diagnose' and len(seq_vec) != 0):
        seq_vec_slide.append({'index': i, "seq_vec": copy.deepcopy(seq_vec)})

      seq_vec.append(evec[index])
      if i == len(seq) - 1:
        seq_vec_slide.append({'index': i + 1, "seq_vec": copy.deepcopy(seq_vec)})

    result['seq_vec'] = copy.deepcopy(seq_vec)
    result[pid]['sequence'] = copy.deepcopy(seq)
    result[pid]['seq_vec_slide'] = copy.deepcopy(seq_vec_slide)

    return {'pid':pid, 'result':result}

def get_udf_distance(array1, array2):
    distance, path = fastdtw(array1, array2, dist=euclidean)
    return distance

if __name__=="__main__":

    with open('/home/zcjin/cut_spark/data/p_list.json', 'r') as f:
        p_list = json.load(f)


    with open('/home/zcjin/cut_spark/data/p_all.json', 'r') as f:
        global patient
        patient_set = json.load(f)

    with open('/home/zcjin/cut_spark/data/vectors.json', 'r') as f:
        json_obj = json.load(f)
        global vocab
        vocab = json_obj['vocab']
        global evec
        evec=json_obj['evec']

    print 'load finished!!'
    cut_set = {}

    conf = SparkConf()
    sc = SparkContext(conf=conf)

    global cur_vec

    udf_dtw = udf(get_udf_distance, FloatType())

    for id in p_list:

        data_all = {}
        cur_vec = []
        print 'start' + id
        cur_seq = copy.deepcopy(patient_set[str(id)])
        sim_set = copy.deepcopy(patient_set)

        for event in cur_seq:
          event_str = event['event_code']
          index = vocab.index(str(event_str))
          cur_vec.append(evec[index])

        data_set = sc.parallelize(sim_set.items()).map(get_slide).collect()
        for row in data_set:
            data_all[row['pid']] = row['result']

        print 'finished!'
        cut_patient = {}

        for pid, data in data_all.items():
            min_distance = 10000000000000000
            cut_index = -1
            for seq in reversed(data['seq_vec_slide']):
              distance = udf_dtw(cur_vec, seq["seq_vec"])
              if min_distance >= distance:
                if seq['index'] != 1:
                  cut_index = seq['index']
                  min_distance = distance
                continue
              else:
                break

            cut_patient[pid] = cut_index

        print 'cut' + id

        cut_set[id] = cut_patient

    with open('/home/zcjin/cut_spark/data/cut_index.json', 'w') as f:
        json.dump(cut_set,f)




