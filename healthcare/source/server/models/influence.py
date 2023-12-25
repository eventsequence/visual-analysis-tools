
import sys
from scipy.spatial.distance import euclidean
import numpy as np
import json
from scipy import stats
from collections import defaultdict
import math

def json_loads_byteified(json_text):
    return _byteify(
        json.loads(json_text, object_hook=_byteify),
        ignore_dicts=True
    )

def _byteify(data, ignore_dicts = False):
    # if this is a unicode string, return its string representation
    if isinstance(data, unicode):
        return data.encode('utf-8')
    # if this is a list of values, return list of byteified values
    if isinstance(data, list):
        return [ _byteify(item, ignore_dicts=True) for item in data ]
    # if this is a dictionary, return dictionary of byteified keys and values
    # but only if we haven't already byteified it
    if isinstance(data, dict) and not ignore_dicts:
        return {
            _byteify(key, ignore_dicts=True): _byteify(value, ignore_dicts=True)
            for key, value in data.iteritems()
        }
    # if it's anything else, return it in its original form
    return data

def boxplot(p_set):
    with open("data/sigPre.json",'r') as f:
        all_patients = json.load(f)

    matrix = []
    for i in range(8):
        pre_orig = []
        pre_dele = []
        base = all_patients[p_set[0]][i]['origin']
        # print base
        for p in p_set:
            flag = 0
            for ii in range(len(base)):
                if (base[ii]<0.5 and all_patients[p][i]['origin'][ii]>0.5)or(base[ii]>0.5 and all_patients[p][i]['origin'][ii]<0.5): flag = 1
                # if abs(base[ii]-all_patients[p][i]['origin'][ii])>=0.5: flag=1
            if all_patients[p][i]['has']==1 and flag ==0:

                pre_orig.append(all_patients[p][i]['origin'])
                pre_dele.append(all_patients[p][i]['dele'])
        pre_orig = np.array(pre_orig)
        pre_dele = np.array(pre_dele)

        row = []
        # print pre_orig.shape
        if pre_orig.shape[0]>0:
            for j in range(pre_orig.shape[1]):

                box = {}
                box['lab'] = i
                box['disease'] = j
                sig = stats.ttest_rel(pre_orig[:,j], pre_dele[:,j])
                if math.isnan(sig[1]):
                    box['sig'] = 1
                else:
                    box['sig'] = sig[1]
                # min_ = pre_orig[:,j].min()
                # percentile_ = np.percentile(pre_orig[:,j], [25, 75])
                percentile_ = stats.t.interval(0.9,len(pre_orig[:,j])-1, loc=np.mean(pre_orig[:,j]), scale=stats.sem(pre_orig[:,j]))
                mean = np.mean(pre_orig[:,j])
                # max_ = pre_orig[:,j].max()
                box['prob'] = []
                # box['prob'].append(min_)
                box['prob'].append(percentile_[0])
                box['prob'].append(mean)
                box['prob'].append(percentile_[1])
                box['prob'].append(stats.sem(pre_orig[:,j]))
                # box['prob'].append(max_)

                # del_min_ = pre_dele[:,j].min()
                # del_percentile_ = np.percentile(pre_dele[:,j], [25, 75])
                del_percentile_ = stats.t.interval(0.9,len(pre_orig[:,j])-1, loc=np.mean(pre_dele[:,j]), scale=stats.sem(pre_dele[:,j]))
                del_mean = np.mean(pre_dele[:,j])
                # del_max_ = pre_dele[:,j].max()
                box['del_prob'] = []
                # box['del_prob'].append(del_min_)
                
                box['del_prob'].append(del_percentile_[0])
                box['del_prob'].append(del_mean)
                box['del_prob'].append(del_percentile_[1])
                box['del_prob'].append(stats.sem(pre_dele[:,j]))
                # box['del_prob'].append(del_max_)

                row.append(box)
            
            if row[0]['sig']<1:
                # new_row = sorted(row, key=lambda b: b['sig'])
                matrix.append(row)
    new_matrix = sorted(matrix, key=lambda r: sum([ (0 if b['sig']<=0.01 else 1) for b in r]))
    # print json.dumps(len(new_matrix))
    sort_index = sorted(range(len(new_matrix[0])), key= lambda i: sum([(0 if r[i]['sig']<=0.01 else 1) for r in new_matrix]))
    new_new_matrix = []
    for i in range(len(new_matrix)):
        new_row = []
        for j in range(len(sort_index)):
            new_row.append(new_matrix[i][sort_index[j]])
        new_new_matrix.append(new_row)

    print json.dumps(new_new_matrix)
    return new_matrix


if __name__=="__main__":
    patient_set = sys.argv[1]
    # tmppath = 'server/tmp/selected_patient.json'
    patient_set = json_loads_byteified(patient_set)

    boxplot(patient_set)

