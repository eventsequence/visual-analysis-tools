
import sys
from scipy.spatial.distance import euclidean
import numpy as np
import json
from fastdtw import fastdtw
import copy
import re
from layout import layout
from collections import defaultdict
from sklearn.cluster import DBSCAN
import time
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

def alignment(cur_seq, sim_set):
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
            if (event['event_type']=='diagnose' and len(seq_vec)!=0):
                seq_vec_slide.append({'index':i, "seq_vec":copy.deepcopy(seq_vec)})
            seq_vec.append(evec[index])

            if i==len(seq)-1:
                seq_vec_slide.append({'index': i+1, "seq_vec": copy.deepcopy(seq_vec)})

        data_all[pid]['seq_vec'] = copy.deepcopy(seq_vec)
        data_all[pid]['sequence'] = copy.deepcopy(seq)
        data_all[pid]['seq_vec_slide'] = copy.deepcopy(seq_vec_slide)


    for pid, data in data_all.items():
        min_distance = 10000000000000000
        cut_index = -1
        # print "pid"
        # if pid == "7534":
        #     print len(data['seq_vec_slide'])

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
        # print 'cut'
        # print cut_index
        # print len(data_all[pid]['sequence'])


    seq_all = []
    # for pid, data in data_all.items():
    #     seq_all.append(data)
    his_vect_all = []
    result_list = {}
    for pid, seq in data_all.items():
        his_vect_all.append(seq['seq_vec'][0:seq['cut_index']])
        data_all[pid]['his_vect'] = seq['seq_vec'][0:seq['cut_index']]
        if seq['cut_index'] == len(seq['seq_vec']):
            result_list[pid] = []
            data_all[pid]['result_code'] = []
            data_all[pid]['result_vect'] = []
            data_all[pid]['result_group'] = []
        else:
            # result_list[pid] = seq['sequence'][seq['cut_index']:len(seq['seq_vec'])]
            data_all[pid]['result_code'] = [event['event_code'] for event in seq['sequence'][seq['cut_index']:len(seq['seq_vec'])]]
            data_all[pid]['result_vect'] = seq['seq_vec'][seq['cut_index']:len(seq['seq_vec'])]
            data_all[pid]['result_group'] = xrange(seq['cut_index'],len(seq['seq_vec']))

    # print len(sim_set.items())
    seq_min = np.array(min(his_vect_all, key=len))
    # print 'min'
    # print len(seq_min)


    o_distance, o_path = fastdtw(seq_min, cur_vec, dist=euclidean)
    current_group = groupPath(o_path)
    current_align = []
        
    for l in range(len(seq_min)):
        tmp1 = cur_seq[current_group[l][0]:(current_group[l][-1]+1)]
        current_align.append(tmp1)
    

 
    paths = []

    for pid, seq in data_all.items():
        distance, path = fastdtw(seq_min, seq['his_vect'], dist=euclidean)
        paths.append(path)
        data_all[pid]['path'] = path
        # print "path"
        # print path

    paths_group = []
    for pid, seq in data_all.items():
        grouped = groupPath(seq['path'])
        # print "group"
        # print grouped
        data_all[pid]['path_group'] = grouped
        paths_group.append(grouped)

    align_list = {}
    align_time_list = {}
    new_data_all = {}

    result_length = 0

    for pid, seq in data_all.items():
        ppath = seq['path_group']
        align = []
        align_vector = []
        align_code = []
        for l in range(len(seq_min)):
            tmp1 = data_all[pid]['sequence'][ppath[l][0]:(ppath[l][-1]+1)]
            tmp2 = data_all[pid]['seq_vec'][ppath[l][0]:(ppath[l][-1]+1)]
            tmp3 = [event['event_code'] for event in data_all[pid]['sequence'][ppath[l][0]:(ppath[l][-1]+1)]]
            align.append(tmp1)
            align_vector.append(tmp2)
            align_code.append(tmp3)
        data_all[pid]['align'] = align
        data_all[pid]['align_vector'] = align_vector
        data_all[pid]['align_code'] = align_code
        # align_list[pid]=align

        if len(data_all[pid]['result_code'])>result_length:
            result_length = len(data_all[pid]['result_code'])

        new_data_all[pid] = {}
        new_data_all[pid]['align']  = data_all[pid]['align']
        new_data_all[pid]['align_code'] = data_all[pid]['align_code']
        new_data_all[pid]['align_vector']  = data_all[pid]['align_vector']
        new_data_all[pid]['path_group']  = data_all[pid]['path_group']
        new_data_all[pid]['result_code'] = data_all[pid]['result_code']
        new_data_all[pid]['result_vect'] = data_all[pid]['result_vect']
        new_data_all[pid]['result_group'] = data_all[pid]['result_group']
    # #########finish alignment
    # print "finished"
    #
    # with open("alignment_object.json",'wb') as f:
    #   json.dump(new_data_all,f)
    # print "length"
    # print len(seq_min)

    # with open("alignment_object.json",'rb') as f:
    #   data_all = json.load(f)
    vectors_all = generate_vectors(new_data_all, len(seq_min), result_length)
    nodes,links, stage_all = connection(vectors_all, data_all)

    stage_num = len(seq_min)

    node_dict = {}

    for node in nodes:
        node_dict[node['name']] = node['value']

        node_name = node['name']
        node_i = int(re.split('[c t]',node_name)[1])
        node_t = int(re.split('[c t]', node_name)[2])
        node_list = node['e_list']
        for e in node_list:
            for pos in e['event_pos']:
                data_all[e['pid']]['sequence'][pos]['stage'] = node_t
                data_all[e['pid']]['sequence'][pos]['cluster'] = node_i

    for pid, seq in data_all.items():
        ppath = seq['path_group']
        align = []
        align_time = []
        align_duration =[]
        for l in range(len(seq_min)):
            tmp1 = data_all[pid]['sequence'][ppath[l][0]:(ppath[l][-1] + 1)]
            start = int(time.mktime(time.strptime(tmp1[0]['event_time'], '%Y-%m-%d %H:%M:%S' )))/1000
            end = int(time.mktime(time.strptime(tmp1[-1]['event_time'], '%Y-%m-%d %H:%M:%S' )))/1000
            
            align_time.append({'time':[start,end],'type':tmp1[0]['event_type']})
            align.append(tmp1)

        for l in range(len(seq_min)-1):
            align_duration.append({'time': align_time[l+1]['time'][0]-align_time[l]['time'][1], "type": align_time[l+1]['type']})

        align_list[pid] = align
        align_time_list[pid] = align_duration

        if seq['cut_index'] == len(seq['seq_vec']):
            result_list[pid] = []
        else:
            result_list[pid] = seq['sequence'][seq['cut_index']:len(seq['seq_vec'])]

    result_time_list = {}
    for pid, result in result_list.items():
        result_time = []
        for r in range(len(result)-1):
            start = int(time.mktime(time.strptime(result[r]['event_time'], '%Y-%m-%d %H:%M:%S' )))/1000
            end = int(time.mktime(time.strptime(result[r+1]['event_time'], '%Y-%m-%d %H:%M:%S' )))/1000

            result_time.append({'time': end-start, 'type': result[r+1]['event_type']})
        result_time_list[pid] = result_time

    # print  "finished!!!!!!"
    sankeyObj={
            'nodes':nodes,
            'links':links
            }


    final_pos = layout(stage_all, sankeyObj, node_dict, len(data_all.items()))
    # with open("stage_vec.json",'wb') as f:
    #   json.dump(stage_vec,f)
    #
    # with open("sankeyobj.json",'wb') as f:
    #   json.dump(sankeyObj,f)
    # cluster_layout=layout(stage_vec,sankeyObj)


    alignObj = {
        "align": align_list,
        "result": result_list,
        "current_align": current_align,
        "align_time": align_time_list,
        "result_time": result_time_list
    }

    clusterObj = {
        'nodes':nodes,
        'links':links,
        'layout':final_pos
    }

    # print links
    # print cluster_layout[-1]
    # with open("final_result.json",'wb') as f:
    #   json.dump({"alignObj":alignObj, 'clusterObj':clusterObj},f)

    print json.dumps({"alignObj":alignObj, 'clusterObj':clusterObj})
    return {"alignObj":alignObj, 'clusterObj':clusterObj}

def generate_vectors(data_all, stage_num, result_sum):

    vectors_all=[[] for x in xrange(0,stage_num+result_sum)]
    plist=data_all.keys()

    for pid in plist:
        align_code=data_all[pid]['align_code']
        align_vector=data_all[pid]['align_vector']
        align_group = data_all[pid]['path_group']

        for i in xrange(0,stage_num):
            code=align_code[i]
            vector=align_vector[i]
            group=align_group[i]
            # set_code = []
            # new_group = []
            # new_vector = []
            # for c in range(len(code)-1,-1,-1):
            #     if code[c] in set_code:
            #         continue
            #     else:
            #         new_group.append(group[c])
            #         set_code.append(code[c])
            #         new_vector.append(vector[c])

            vectors_all[i].append({'code':code, 'vector':vector, 'pid':pid, 'group':group})

        for i in xrange(0, result_sum):
            if len(data_all[pid]['result_code'])>i:
                vectors_all[stage_num + i].append({'code': [data_all[pid]['result_code'][i]], 'vector': [data_all[pid]['result_vect'][i]], 'pid':pid, 'group': [data_all[pid]['result_group'][i]]})
    
    return vectors_all

def connection(vectors_all, data_all):
    # generate nodes

    nodes_stage = []
    nodes_stage_vector = []
    for i,stage in enumerate(vectors_all):
        stage_vectors = []
        stage_event = []
        for patient in stage:
            stage_vectors.extend(patient['vector'])
            stage_event.extend(patient['code'])
        event_num = {}
        for event in stage_event:
            if event in event_num:
                event_num[event] += 0
            else:
                event_num[event] = len(event_num)
        n_clusters=len(event_num)
        labels = []

        for event in stage_event:
            test = event_num[event]
            labels.append(event_num[event])
        # labels, n_clusters = dbScan(stage_vectors)
        # print "clustering"
        # print labels
        # print n_clusters
        event_index = 0
        tmp_stage = [[] for x in xrange(0, n_clusters)]
        tmp_dict = [{} for x in xrange(0, n_clusters)]
        tmp_vector = [[] for x in xrange(0, n_clusters)]
        for patient in stage:
            for e in range(len(patient['code'])):
                if tmp_dict[labels[event_index]].has_key(patient['pid']):
                    tmp_dict[labels[event_index]][patient['pid']].append(patient['group'][e])
                else:
                    tmp_dict[labels[event_index]][patient['pid']]=[patient['group'][e]]
                event_index = event_index+1

        for c, cluster in enumerate(tmp_dict):
            for (key, patient) in cluster.items():
                tmp_stage[c].append({"pid": key, "event_pos": patient})
                # tmp_vector[labels[event_index]].append(patient['vector'][e])
                # print labels[event_index]
                # print patient['vector'][e]
                
        # print tmp_vector
        # nodes_stage_vector.append(tmp_vector)
        nodes_stage.append(tmp_stage)

    node_list = []
    nodes = []
    links = []
    values = {}
    link_plist={}

    stage_all = []

    #cstage_vec=[[-1 for i in xrange(0,len(nodes_stage_vector[x]))] for x in xrange(0,len(nodes_stage_vector))]

    for m in xrange(0, len(nodes_stage)):
        stage_all.append(len(nodes_stage[m]))

        for n in xrange(0, len(nodes_stage[m])):
            # if(cstage_vec[m][n]==-1):
            #     c_vec=nodes_stage_vector[m][n]
            #     cstage_vec[m][n]=np.mean(np.array(c_vec),axis=0).tolist()
            if m != len(nodes_stage)-1:
                for e in nodes_stage[m][n]:
                    p_index = e['pid']
                    next_clusters = find_cluster(nodes_stage[m+1], p_index)
                    cur_pid_num = find_pid(nodes_stage[m], p_index)
                    # print next_clusters
                    # if m+1 == len(nodes_stage)-1 and len(next_clusters) == 0:
                    #     key = 'c' + str(n) + 't' + str(m) + '-' + 'c' + str(1) + 't' + str(m + 1)

                    #     if ~values.has_key(key):
                    #         values[key] = 0.1

                    #     nodes.append({
                    #         'name': 'c' + str(n) + 't' + str(m),
                    #         'e_list': nodes_stage[m][n]
                    #     })

                    #     if ~link_plist.has_key(key):
                    #         link_plist[key]=[]

                    for c in next_clusters:
                        key = 'c' + str(n) + 't' + str(m) + '-' + 'c' + str(c) + 't' + str(m+1)
                        if values.has_key(key):
                            values[key] += 1.0/(cur_pid_num*len(next_clusters))
                            # if key == 'c0t20-c0t21':
                            #   print p_index
                            #   print next_clusters
                            #   print cur_pid_num
                            #   print values[key]
                        else:
                            values[key] = 1.0/(cur_pid_num*len(next_clusters))
                            # if key == 'c0t20-c0t21':
                            #   print p_index
                            #   print next_clusters
                            #   print cur_pid_num
                            #   print values[key]

                        nodes.append({
                            'name': 'c' + str(n) + 't' + str(m),
                            'e_list': nodes_stage[m][n]
                        })
                        nodes.append({
                            'name': 'c' + str(c) + 't' + str(m+1),
                            'e_list': nodes_stage[m+1][c]
                            # 'p_list': cluster_arrs[next_stage][next_cluster]
                        })
                        if link_plist.has_key(key):
                            link_plist[key].append({'start':e, 'end':nodes_stage[m+1][c] })
                        else:
                            link_plist[key]=[{'start':e, 'end':nodes_stage[m+1][c] }]
            else:
                nodes.append({
                    'name': 'c' + str(n) + 't' + str(m),
                    'e_list': nodes_stage[m][n]
                    #'p_list': cluster_arrs[m][n]
                })

    for (key, value) in values.items():
        source = key.split('-')[0]
        target = key.split('-')[1]

        list_event = link_plist[key]
        start_pid = {}
        end_pid = {}
        for s in list_event:
            e = s['start']
            if start_pid.has_key(e['pid']):
                T = time.strptime(data_all[e['pid']]['sequence'][e['event_pos'][0]]['event_time'], '%Y-%m-%d %H:%M:%S')
                T = int(time.mktime(T))/1000
                if T>start_pid[e['pid']]['event_time']:
                    start_pid[e['pid']]['event_time'] = T
                    start_pid[e['pid']]['event_type'] = data_all[e['pid']]['sequence'][e['event_pos'][0]]['event_type']

            else:
                T = time.strptime(data_all[e['pid']]['sequence'][e['event_pos'][0]]['event_time'], '%Y-%m-%d %H:%M:%S')
                T = int(time.mktime(T))/1000
                start_pid[e['pid']] = {'event_type': data_all[e['pid']]['sequence'][e['event_pos'][0]]['event_type'],
                                       'event_time': T}
        if len(list_event)>0:
            end =  list_event[0]['end']
            for e in end:
                if start_pid.has_key((e['pid'])):
                    if end_pid.has_key(e['pid']):
                        T = time.strptime(data_all[e['pid']]['sequence'][e['event_pos'][-1]]['event_time'], '%Y-%m-%d %H:%M:%S')
                        T = int(time.mktime(T))/1000
                        if T<end_pid[e['pid']]['event_time']:
                            end_pid[e['pid']]['event_time'] = data_all[e['pid']]['sequence'][e['event_pos'][-1]]['event_time']
                            end_pid[e['pid']]['event_type'] = data_all[e['pid']]['sequence'][e['event_pos'][-1]]['event_type']
                    else:
                        T = time.strptime(data_all[e['pid']]['sequence'][e['event_pos'][-1]]['event_time'], '%Y-%m-%d %H:%M:%S')
                        T = int(time.mktime(T))/1000
                        end_pid[e['pid']] = {'event_type': data_all[e['pid']]['sequence'][e['event_pos'][-1]]['event_type'],
                                               'event_time': T}
        time_array = []
        type_array = []
        for pid, event in start_pid.items():
            if end_pid.has_key(pid):
                time_array.append(end_pid[pid]['event_time']-event['event_time'])
                type_array.append(end_pid[pid]['event_type'])
        if len(time_array)>0:
            average_time = sum(time_array) / float(len(time_array))
        else:
            average_time = 1



        # print len(list_event)
        # print value

        # value = math.pow(value,0.05)*10
        max_type = max(type_array, key=type_array.count)
        links.append({
            'source': source,
            'target': target,
            'value': value,
            'connect':{'duration': average_time, "type": max_type}
        })

    nodes = {v['name']: v for v in nodes}.values()

    for node in nodes:
        value_source = 0
        value_target = 0
        # node['sourceLinks'] = []
        # node['targetLinks'] = []
        for link in links:
            if link['source'] == node['name']:
                # node['sourceLinks'].append(link)
                value_source += link['value']
            if link['target'] == node['name']:
                # node['targetLinks'].append(link)
                value_target += link['value']

        node['value'] = max([value_source, value_target])

        e_pid = node['e_list'][0]['pid']
        e_pos = node['e_list'][0]['event_pos'][0]
        
        node['type'] = data_all[e_pid]['sequence'][e_pos]['event_type']
        node['code'] = data_all[e_pid]['sequence'][e_pos]['event_code']
    return nodes, links, stage_all

def find_cluster(stage,p_index):
    clusters = []
    for i in xrange(0,len(stage)):
        for e in stage[i]:
            if p_index == e['pid']:
                clusters.append(i)
                break
    return clusters

def find_pid(stage,p_index):
    num = 0
    for i in xrange(0,len(stage)):
        for e in stage[i]:
            if p_index == e['pid']:
                num+=1
                break
    return num

def groupPath(l):
    d=defaultdict(list)
    for entry in l:
        d[entry[0]].append(entry[1])
    return d


def dbScan(stamp):
    db = DBSCAN(eps=7,min_samples = 1).fit(stamp)
    labels = db.labels_
    n_clusters_ = len(set(labels))
    new_labels = []
    if -1 in labels:
        # print 'yes!!!!!'
        for l in labels:
            new_labels.append(l+1)
    else:
        for l in labels:
            new_labels.append(l)

    return new_labels, n_clusters_



if __name__=="__main__":
    # cur_seq = sys.argv[1]
    tmppath = 'server/tmp/selected_patient.json'
    # cur_seq = json_loads_byteified(cur_seq)
    with open(tmppath) as f:
        sim_set = json.load(f)

    with open("server/tmp/current_patient.json",'rb') as f:
        cur_seq = json.load(f)
    #
    # with open('../../server/tmp/selected_patient.json') as f:
    #     sim_set = json.load(f)

    with open('data/vectors.json', 'r') as f:
        json_obj = json.load(f)
        global vocab
        vocab = json_obj['vocab']
        global evec
        evec=json_obj['evec']


    #
    # cur_seq = sim_set["307"]

    alignment(cur_seq, sim_set)

