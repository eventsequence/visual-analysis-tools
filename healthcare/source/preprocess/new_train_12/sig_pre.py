import numpy as np
import cPickle as pickle
import test_retain
import copy
from scipy import stats
import json

treat = np.array(pickle.load(open("data/mimic.treat")))
morts = np.array(pickle.load(open("data/mimic.mortsnew")))
seqs = np.array(pickle.load(open("data/mimic.seqsnew")))
dates = np.array(pickle.load(open("data/mimic.datesnew")))
with open("label.json",'rb') as f:
    labels = np.array(json.load(f))

with open("pids.json",'rb') as f:
    pids = json.load(f)
 
diseaseid = 0
classid = xrange(8)
delid_list = []

for id in classid:
    delclass = np.where(labels == id )
    delid = treat[delclass]
    delid = [int(i) for i in delid]
    delid_list.append(delid)
# delid = [615, 252, 839, 534, 267, 264, 253, 520, 519, 230, 243, 389, 676, 251, 371, 419, 302, 623, 674]
# print delclass
def computed(patient):
    pre, contributions = test_retain.train_RETAIN(
        modelFile='../../server/models/retain-api/model/mimic.9.npz',
        patient=patient,
        typeFile='../../server/models/retain-api/data/mimic.types',
        useLogTime=True,
        embFile = '',
        logEps=1e-8
	)
    return pre

def contains(seq, treat):

    for visit in seq:
        for i in range(len(visit)):
            if visit[i] in treat:
                return True
    return False


idx = []

results = {}
for c in range(8):
    seq_set = []
    date_set = []
    del_treat = delid_list[c]
    seq_set_del = []
    date_set_del = []
    contains_flag = []
    sum =0
    for i in range(len(seqs)):
        
        seqsnew = seqs[i]
        if(contains(seqs[i],del_treat)):

            contains_flag.append(1)
            seq_set.append(seqs[i])
            date_set.append(dates[i])

            seq_new = copy.deepcopy(seqs[i])
            date_new = copy.deepcopy(dates[i])

            for visit in seq_new:
                for i in reversed(range(len(visit))):
                    if visit[i] in del_treat: visit.pop(i)

            for i in reversed(range(len(seq_new))):
                if len(seq_new[i]) == 0:
                    seq_new.pop(i)
                    date_new.pop(i)

            seq_set_del.append(seq_new)
            date_set_del.append(date_new)
        else:
            contains_flag.append(0)
            seq_set.append(seqs[i])
            date_set.append(dates[i])

            seq_new = copy.deepcopy(seqs[i])
            date_new = copy.deepcopy(dates[i])

            for visit in seq_new:
                for i in reversed(range(len(visit))):
                    if visit[i] in del_treat: visit.pop(i)

            for i in reversed(range(len(seq_new))):
                if len(seq_new[i]) == 0:
                    seq_new.pop(i)
                    date_new.pop(i)

            seq_set_del.append(seq_new)
            date_set_del.append(date_new)
        # print len(seqs[idx])

    pre1 = computed((seq_set, date_set))
    pre2 = computed((seq_set_del, date_set_del))
    for i in range(len(seqs)):
        if results.has_key(pids[i]):
            if contains_flag[i]:
                sum += 1
                print sum
                results[pids[i]].append({'has':1, 'origin':pre1[i], 'dele': pre2[i]})
            else:
                results[pids[i]].append({'has':0, 'origin':pre1[i], 'dele': pre2[i]})
        else:
            if contains_flag[i]:
                sum += 1
                print sum
                results[pids[i]] = [{'has':1, 'origin':pre1[i], 'dele': pre2[i]}]
            else:
                results[pids[i]] = [{'has':0, 'origin':pre1[i], 'dele': pre2[i]}]
                
with open("../../data/sigPre.json",'wb') as f:
    json.dump(results, f)
    # for i in range(pre1.shape[1]):
    #     result = stats.ttest_rel(pre1[:,i], pre2[:,i])
    #     print result

# pre1 = [pre[diseaseid] for pre in pre1]
# pre2 = [pre[diseaseid] for pre in pre2]





