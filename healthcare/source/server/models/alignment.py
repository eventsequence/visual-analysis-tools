
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
            index = vocab.index(str(event_str))
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

    his_vect_visit = []

    result_list = {}
    result_time_list = {}

    for pid, seq in data_all.items():
        #his_vect_all.append(seq['seq_vec'][0:seq['cut_index']])
        data_all[pid]['his_vect'] = seq['seq_vec'][0:seq['cut_index']]
        if seq['cut_index'] == len(seq['seq_vec']):
            result_list[pid] = []
            data_all[pid]['result_code'] = []
            data_all[pid]['result_vect'] = []
            data_all[pid]['result_group'] = []
            data_all[pid]['result_seq'] = []
        else:
            # result_list[pid] = seq['sequence'][seq['cut_index']:len(seq['seq_vec'])]
            data_all[pid]['result_seq'] = seq['sequence'][seq['cut_index']:len(seq['seq_vec'])]
            result_visits = []
            for e in range(seq['cut_index'],len(seq['seq_vec'])):
                if len(result_visits) == 0:
                    result_visits.append({'event_time': seq['sequence'][e]['event_time'], 'visit_group': [e], 'vector': [seq['seq_vec'][e]], 'sequence': [seq['sequence'][e]]})
                else:
                    if seq['sequence'][e]['event_time'] == result_visits[-1]['event_time']:
                        result_visits[-1]['vector'].append(seq['seq_vec'][e])
                        result_visits[-1]['sequence'].append(seq['sequence'][e])
                        result_visits[-1]['visit_group'].append(e)
                    else:
                        result_visits.append({'event_time': seq['sequence'][e]['event_time'], 'visit_group': [e], 'vector': [seq['seq_vec'][e]], 'sequence': [seq['sequence'][e]]})
            tmp1 = []
            tmp2 = []
            tmp3 = []
            for visit in result_visits:
                tmp1.append([event['event_code'] for event in visit['sequence']])
                tmp2.append(visit['vector'])
                tmp3.append(visit['visit_group'])

            data_all[pid]['result_code'] = tmp1
            data_all[pid]['result_vect'] = tmp2
            data_all[pid]['result_group'] = tmp3

    for pid, seq in data_all.items():
        visits = []
        # if pid == '56287':
        #     print seq['sequence']

        for e, event in enumerate(seq['his_vect']):
            if len(visits) == 0:
                visits.append({'event_time': seq['sequence'][e]['event_time'], 'visit_group': [e], 'vector': [seq['seq_vec'][e]], 'sequence': [seq['sequence'][e]]})
            else:
                if seq['sequence'][e]['event_time'] == visits[-1]['event_time']:
                    visits[-1]['vector'].append(seq['seq_vec'][e])
                    visits[-1]['sequence'].append(seq['sequence'][e])
                    visits[-1]['visit_group'].append(e)
                else:
                    visits.append({'event_time': seq['sequence'][e]['event_time'], 'visit_group': [e], 'vector': [seq['seq_vec'][e]], 'sequence': [seq['sequence'][e]]})
        visit_vec = []
        visit_group = []
        for visit in visits:
            visit_vec.append(np.mean(np.array(visit['vector']),axis=0).tolist())
            visit_group.append(visit['visit_group'])
        data_all[pid]['visit_vec'] = visit_vec
        data_all[pid]['visit_group'] = visit_group
        his_vect_visit.append(visit_vec)
    # print len(sim_set.items())


    seq_min = np.array(min(his_vect_visit, key=len))


    # print 'min'
    # print len(seq_min)
    paths = []

    for pid, seq in data_all.items():
        distance, path = fastdtw(seq_min, seq['visit_vec'], dist=euclidean)
        paths.append(path)
        data_all[pid]['path'] = path
        # print "path"
        # print path

    paths_group = []

    min_path_group = []

    op_group = []
    for pid, seq in data_all.items():
        grouped_rev = groupPath_rev(seq['path'])
        for key, g in grouped_rev.items():
            if len(g)>1:
                op_group.append(g)

    opp_group = []
    sorted_group = sorted(op_group, key = lambda g: g[0])

    for g in range(len(sorted_group)):
        if len(opp_group)==0:
            opp_group.append(sorted_group[g])
        else:
            if(sorted_group[g][0]<opp_group[-1][-1]):
                for gg in sorted_group[g]:
                    if gg>opp_group[-1][-1]:
                        opp_group[-1].append(gg)
            else:
                opp_group.append(sorted_group[g])
    ii = 0 

    while ii< len(seq_min):
        if len(opp_group)>0:
            if ii<opp_group[0][0]:
                min_path_group.append([ii])
                ii += 1
            else:
                min_path_group.append(opp_group[0])
                ii = opp_group[0][-1]+1
                opp_group.pop(0)
        else:
            min_path_group.append([ii])
            ii += 1
        #print min_path_group

    

    for pid, seq in data_all.items():
        grouped = groupPath(seq['path'])
        
        new_grouped = {}
        for index, g in enumerate(min_path_group):
            new_grouped[index]=[]
            for gg in g:
                new_grouped[index].extend(grouped[gg])   

        # print "group"
        # print grouped
        data_all[pid]['align_group'] = new_grouped
        paths_group.append(grouped)

    align_list = {}
    align_time_list = {}
    new_data_all = {}

    result_length = 0

    for pid, seq in data_all.items():
        ppath = seq['align_group']
        align = []
        align_vector = []
        align_code = []
        path_group = []

        for l in range(len(min_path_group)):
            tmp1 = []
            tmp2 = []
            tmp3 = []
            tmp4 = []
            for ll in range(ppath[l][0],(ppath[l][-1]+1)):
                tmp1.extend(data_all[pid]['sequence'][data_all[pid]['visit_group'][ll][0]:(data_all[pid]['visit_group'][ll][-1]+1)])
                tmp2.extend(data_all[pid]['seq_vec'][data_all[pid]['visit_group'][ll][0]:(data_all[pid]['visit_group'][ll][-1]+1)])
                tmp3.extend([event['event_code'] for event in data_all[pid]['sequence'][data_all[pid]['visit_group'][ll][0]:(data_all[pid]['visit_group'][ll][-1]+1)]])
                tmp4.extend(data_all[pid]['visit_group'][ll])
            align.append(tmp1)
            align_vector.append(tmp2)
            align_code.append(tmp3)
            path_group.append(tmp4)

        data_all[pid]['align'] = align
        data_all[pid]['align_vector'] = align_vector
        data_all[pid]['align_code'] = align_code
        data_all[pid]['path_group'] = path_group
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
    ####################################################################################
    cur_visits = []
    for e, event in enumerate(cur_vec):
        if len(cur_visits) == 0:
            cur_visits.append({'event_time': cur_seq[e]['event_time'], 'visit_group': [e], 'vector': [cur_vec[e]], 'sequence': [cur_seq[e]]})
        else:
            if cur_seq[e]['event_time'] == cur_visits[-1]['event_time']:
                cur_visits[-1]['vector'].append(cur_vec[e])
                cur_visits[-1]['sequence'].append(cur_seq[e])
                cur_visits[-1]['visit_group'].append(e)
            else:
                cur_visits.append({'event_time': cur_seq[e]['event_time'], 'visit_group': [e], 'vector': [cur_vec[e]], 'sequence': [cur_seq[e]]})

    cur_visit_vec = []
    cur_visit_group = []
    for visit in cur_visits:
        cur_visit_vec.append(np.mean(np.array(visit['vector']),axis=0).tolist())
        cur_visit_group.append(visit['visit_group'])


    o_distance, o_path = fastdtw(seq_min, cur_visit_vec, dist=euclidean)
    current_group = groupPath(o_path)
    current_align = []
    new_current_grouped = {}
    for index, g in enumerate(min_path_group):
        new_current_grouped[index]=[]
        for gg in g:
            new_current_grouped[index].extend(current_group[gg]) 
        
    for l in range(len(min_path_group)):
        tmp1 = []
        for ll in range(new_current_grouped[l][0],(new_current_grouped[l][-1]+1)):
            tmp1.extend(copy.deepcopy(cur_seq[cur_visit_group[ll][0]:(cur_visit_group[ll][-1]+1)]))

        for e in range(len(tmp1)):
            tmp1[e]['stage']=l
        current_align.append(tmp1)
 ######################################################################################################################


    vectors_all = generate_vectors(new_data_all, len(min_path_group), result_length)
    nodes,links, stage_all = connection(vectors_all, data_all)

    stage_num = len(min_path_group)

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
        for l in range(len(min_path_group)):
            tmp1 = data_all[pid]['sequence'][ppath[l][0]:(ppath[l][-1] + 1)]
            start = int(time.mktime(time.strptime(tmp1[0]['event_time'], '%Y-%m-%d %H:%M:%S' )))
            end = int(time.mktime(time.strptime(tmp1[-1]['event_time'], '%Y-%m-%d %H:%M:%S' )))
            
            align_time.append({'time':[start,end],'type':tmp1[0]['event_type']})
            align.append(tmp1)

        for l in range(len(min_path_group)-1):
            align_duration.append({'time': align_time[l+1]['time'][0]-align_time[l]['time'][0], "type": align_time[l+1]['type']})

        align_list[pid] = align
        align_time_list[pid] = align_duration


        r_align = []
        r_align_time = []
        r_align_duration =[]
        if seq['cut_index'] == len(seq['seq_vec']):
            result_list[pid] = []
            result_time_list[pid] = []
    
        else:
            rpath = seq['result_group']
            for l in range(len(rpath)):
                r_tmp = data_all[pid]['sequence'][rpath[l][0]:(rpath[l][-1] + 1)]
                r_start = int(time.mktime(time.strptime(r_tmp[0]['event_time'], '%Y-%m-%d %H:%M:%S' )))
                r_end = int(time.mktime(time.strptime(r_tmp[-1]['event_time'], '%Y-%m-%d %H:%M:%S' )))

                r_align_time.append({'time':[r_start,r_end],'type':r_tmp[0]['event_type']})
                r_align.append(r_tmp)
            for l in range(len(rpath)-1):
                r_align_duration.append({'time': r_align_time[l+1]['time'][0]-r_align_time[l]['time'][0], "type": r_align_time[l+1]['type']})

            result_list[pid] = r_align
            result_time_list[pid] = r_align_duration
    
    # for pid, result in result_list.items():
    #     result_time = []
    #     for r in range(len(result)-1):
    #         start = int(time.mktime(time.strptime(result[r]['event_time'], '%Y-%m-%d %H:%M:%S' )))
    #         end = int(time.mktime(time.strptime(result[r+1]['event_time'], '%Y-%m-%d %H:%M:%S' )))

    #         result_time.append({'time': end-start, 'type': result[r+1]['event_type']})
    #     result_time_list[pid] = result_time

    current_time = []
    for a in range(len(current_align)-1):
        start = int(time.mktime(time.strptime(current_align[a][0]['event_time'], '%Y-%m-%d %H:%M:%S' )))
        end = int(time.mktime(time.strptime(current_align[a+1][0]['event_time'], '%Y-%m-%d %H:%M:%S' )))
        current_time.append({'time': end-start, 'type': current_align[a+1][0]['event_type']})
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
        "result_time": result_time_list,
        "current_time": current_time
    }

    clusterObj = {
        'nodes':nodes,
        'links':links,
        'layout':final_pos['layout'],
        'cluster_height':final_pos['cluster_height']
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
                vectors_all[stage_num + i].append({'code': data_all[pid]['result_code'][i], 'vector': data_all[pid]['result_vect'][i], 'pid':pid, 'group': data_all[pid]['result_group'][i]})
    
    return vectors_all

def connection(vectors_all, data_all):
    # generate nodes

    nodes_stage = []
    nodes_stage_vector = []

    code_vector = {}

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
                    tmp_dict[labels[event_index]][patient['pid']]['pos'].append(patient['group'][e])
                    tmp_dict[labels[event_index]][patient['pid']]['vector'].append(patient['vector'][e])
                else:
                    tmp_dict[labels[event_index]][patient['pid']]={"pos":[patient['group'][e]], "vector":[patient['vector'][e]]}
                event_index = event_index+1

        for c, cluster in enumerate(tmp_dict):
            for (key, patient) in cluster.items():
                tmp_stage[c].append({"pid": key, "event_pos": patient['pos'], "event_vector": patient['vector']})
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
                    if len(next_clusters)==0:
                        nodes.append({
                            'name': 'c' + str(n) + 't' + str(m),
                            'e_list': nodes_stage[m][n]
                        })

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
        start_vector = list_event[0]['start']['event_vector'][0]
        end_vector = list_event[0]['end'][0]['event_vector'][0]


        vector_distance = euclidean(np.array(start_vector), np.array(end_vector))

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
            'connect':{'duration': average_time, "type": max_type},
            'distance': vector_distance
        })
        
        

    nodes = {v['name']: v for v in nodes}.values()

    list_dict = {}

    for node in nodes:
        value_source = 0
        value_target = 0
        # node['sourceLinks'] = []
        # node['targetLinks'] = []
        min_target = 100000000000000000
        min_source = 100000000000000000
        target = {}
        source = {}

        for link in links:
            if link['source'] == node['name']:
                # node['sourceLinks'].append(link)
                value_source += link['value']
                if link['distance']<min_source:
                    min_source = link['distance']
                    source = link
                # else:
                #     print link['distance']
                
            if link['target'] == node['name']:
                # node['targetLinks'].append(link)
                value_target += link['value']
                if link['distance']<min_target:
                    min_target = link['distance']
                    target = link
                # else:
                #     print link['distance']
                
        # print source
        # print target
        if source:
            list_dict[source['source']+'-'+source['target']] = source
        if target:
            list_dict[target['source']+'-'+target['target']] = target
        

        node['value'] = max([value_source, value_target])

        e_pid = node['e_list'][0]['pid']
        e_pos = node['e_list'][0]['event_pos'][0]
        
        node['type'] = data_all[e_pid]['sequence'][e_pos]['event_type']
        node['code'] = data_all[e_pid]['sequence'][e_pos]['event_code']

    new_links = []
    for l,key in list_dict.items():
        new_links.append(key)
    return nodes, new_links, stage_all

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

def groupPath_rev(l):
    d=defaultdict(list)
    for entry in l:
        d[entry[1]].append(entry[0])
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
    cur_seq = sys.argv[1]
    tmppath = 'server/tmp/selected_patient.json'
    cur_seq = json_loads_byteified(cur_seq)
    with open(tmppath) as f:
        sim_set = json.load(f)

    # with open("../../server/tmp/current_patient.json",'rb') as f:
    #     cur_seq = json.load(f)
    # #
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

