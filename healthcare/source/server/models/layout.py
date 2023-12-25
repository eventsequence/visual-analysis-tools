#!/usr/bin/env python2
# -*- coding: utf-8 -*-

# from scipy import linalg as LA
# from scipy.spatial import distance
import numpy as np
# import json
# from pprint import pprint

# from operator import itemgetter
# from itertools import groupby

import re
import copy


alpha=0.1
node_padding = 6
link_group={}
threadHeight = 50

# intiate Y position
def initYpos(stage_all, patient_num):
    posArray = []
    stage_num = len(stage_all)

    move_y = (patient_num*threadHeight)/2
    if move_y > 250:
        move_y = 250

    for t in range(stage_num):
        pos = np.random.rand(1, stage_all[t])[0].tolist()
        # e_vecsAry[t] = np.transpose(e_vecsAry[t]) #transpose to row array
        # value = e_valsAry[t].tolist()
        # pos = e_vecsAry[t][value.index(sort_val[t][1])]

        new_stage_y = sorted(range(len(pos)), key=lambda k: pos[k])
        new_new_stage_y = copy.deepcopy(new_stage_y)
        pos_sum = 0
        for j, index in enumerate(new_stage_y):
            new_new_stage_y[index] = pos_sum
            pos_sum += 20*node_dict['c'+str(index)+'t'+str(t)]+node_padding
        for j, p in enumerate(new_new_stage_y):
            new_new_stage_y[j] = new_new_stage_y[j]+move_y-pos_sum/2

        posArray.append(new_new_stage_y)  # no problem
    return posArray


def calcuYpos_new(stage, pos_all, patient_num):
    pos=copy.deepcopy(pos_all[stage])

    move_y = (patient_num*threadHeight)/2
    if move_y > 250:
        move_y = 250

    for cluster in range(len(pos)):
        target='c'+str(cluster)+'t'+str(stage)
        if link_group.has_key(target):
            source_list=link_group[target]
            prepos_sum=0
            weight_sum=0
            for item in source_list:
                source=item['source']

                weight_sum+=1
                source_info=re.split('[c t]',source)
                cluster_index=source_info[1]
                stage_index=int(source_info[2])
                if cluster_index=='*':
                    cluster_index=int(len(pos_all[stage_index])-1)
                else:
                    cluster_index=int(cluster_index)
                prepos=pos_all[stage_index][cluster_index]
                # prepos_sum+=prepos*weight
                prepos_sum+=prepos
            #normalize
            prepos_sum=prepos_sum/weight_sum*1.0
            
            pos[cluster] = alpha * pos[cluster] + (1 - alpha) * prepos_sum
        else:
            pos[cluster] = alpha * pos[cluster]

        new_stage_y = sorted(range(len(pos)), key=lambda k: pos[k])
        new_new_stage_y = copy.deepcopy(new_stage_y)
        pos_sum = 0
        for j, index in enumerate(new_stage_y):
            new_new_stage_y[index] = pos_sum
            pos_sum += 20*node_dict['c'+str(index)+'t'+str(stage)]+node_padding
        for j, p in enumerate(new_new_stage_y):
            new_new_stage_y[j] = new_new_stage_y[j]+move_y-pos_sum/2
    return new_new_stage_y

# get the energy calculation
def energyCal(stage_num, pos):
    energySum = 0
    # interenergy = 0
    transenergy = 0
    for t in range(stage_num):
        # tempenergy = np.dot(pos[t], matrix[t])
        # interenergy = interenergy + alpha * np.dot(tempenergy, np.transpose(pos[t]))
        if (t > 0):
            for i in range(len(pos[t])):
                target='c'+str(i)+'t'+str(t)
                if link_group.has_key(target):
                    source_list=link_group[target]
                    prepos_sum=0
                    weight_sum=0
                    for item in source_list:
                        source=item['source']
                        # weight=item['value']
                        weight_sum+=1
                        source_info=re.split('[c t]',source)
                        cluster_index=source_info[1]
                        stage_index=int(source_info[2])
                        if cluster_index=='*':
                            cluster_index=int(len(pos[stage_index])-1)
                        else:
                            cluster_index=int(cluster_index)
                        prepos=pos[stage_index][cluster_index]
                        # prepos_sum+=prepos*weight
                        prepos_sum+=prepos
                    #normalize
                    # prepos_sum=prepos_sum/weight_sum*1.0
                else:
                    prepos_sum=0
                transenergy = transenergy + ((pos[t][i] - prepos_sum) ** 2)
    energySum = transenergy

    return energySum


#def main(fpath,filter):
def layout(stage_all,sankeyObj,Dict, patient_num):
#    with open(fpath) as data_file:
#        data = json.load(data_file)
#
#    threads = len(data['threads'])
#    timesteps = len(data['threads'][0]['stamps'][filter])

    #print threads, timesteps
#    fs_vectors = getvectorsArray(threads, timesteps,data,filter)
    global node_dict
    node_dict = Dict

    links=sankeyObj['links']    
#with open('sankey.json','r') as f:
#        links=json.load(f)['links']

    link_group_target={}
    link_group_source={}

    for item in links:
        link_group_target.setdefault(item['target'], []).append(item)

    for item in links:
        link_group_source.setdefault(item['source'], []).append(item)
    
    # threads = 5  # thread number
    # timesteps = 5  # timesteps
    threshold = 1e-3

    stopcnt = 0  # count the stop time
    cycle = 0  # count the cycle time

    pos = initYpos(stage_all, patient_num)
    testPosarray = []
    preenergy = 0

    stage_num = len(stage_all)
    
    while (stopcnt < 1):
        cycle = cycle + 1
        temp = []

        for t in range(1, stage_num):
            global link_group
            link_group=copy.deepcopy(link_group_target);
            npos = calcuYpos_new(t, pos, patient_num)
            pos[t] = npos

        for t in xrange(stage_num - 2, -1, -1):
            global link_group
            link_group=copy.deepcopy(link_group_source);
            npos_r = calcuYpos_new(t, pos, patient_num)
            pos[t] = npos_r

        curenergy = energyCal(stage_num, pos)
        if (abs(curenergy) == 0):
            stopcnt = stopcnt + 1
        elif (abs(curenergy - preenergy) / abs(curenergy) < threshold):  # 1e-1 is the threshold value
            stopcnt = stopcnt + 1
        else:
            stopcnt = 0
        preenergy = curenergy

        for k in range(len(pos)):
            for j in range(len(pos[k])):
                pos[k][j] = pos[k][j].real
            # if (cycle == 1):
            #     pos[k] = pos[k].tolist()
            temp.append(copy.deepcopy(pos[k]))

        testPosarray.append(temp) # for testing, I write all cycle data

    # print out
    final_layout = testPosarray[-1]


    min_pos = 100000000000
    max_height = 0
    for s, stage_y in enumerate(final_layout):
        for pos in stage_y:
            if pos<0:
                if pos<min_pos:
                    min_pos = pos
    if min_pos<0:
        for s in range(len(final_layout)):
            for p in range(len(final_layout[s])):
                final_layout[s][p] -= min_pos
                if final_layout[s][p]>max_height:
                    max_height = final_layout[s][p]
                
    
   
        
    return {'layout': final_layout, "cluster_height": max_height}

#layout=main()
#
#with open('layout_cluster.json','w') as f:
#    json.dump(layout[-1],f)