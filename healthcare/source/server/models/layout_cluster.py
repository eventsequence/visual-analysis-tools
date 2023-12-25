#!/usr/bin/env python2
# -*- coding: utf-8 -*-
"""
Created on Tue Jan 30 13:51:18 2018

@author: guoshunan
"""

from scipy import linalg as LA
from scipy.spatial import distance
import numpy as np
import json
from pprint import pprint

from operator import itemgetter
from itertools import groupby

import re
import copy


alpha=0.1
link_group={}
# initiate a Laplace matrix
#def getvectorsArray(threads, timesteps, data, filter):
#    vectorsArray = []
#    for t in range(timesteps):
#        vectors = []
#        for i in range(threads):
#            vec = data['threads'][i]['stamps'][filter][t]['fs']
#            vectors.append(vec)
#        vectorsArray.append(vectors)
#    return vectorsArray

def initLmatrix_new(timesteps, vectorsArray):
    timeslots = timesteps
    threads = []
    #vectorsArray = []
    for t in range(timeslots):
        vectors = vectorsArray[t]
        N=len(vectorsArray[t])
        #used to generate a fs matrix before, no need now
        # vectors = np.random.rand(N, N)
        # vectorsArray.append(vectors)
        dis_matrix = np.zeros(shape=(N, N))
        for i in range(len(dis_matrix)):
            for j in range(len(dis_matrix[i])):
                dis_matrix[i][j] = distance.euclidean(vectors[i], vectors[j])#np.dot(vectors[i], vectors[j])

        L_matrix = np.zeros(shape=(N, N))
        for i in range(len(L_matrix)):
            for j in range(len(L_matrix[i])):
                if (i != j):
                    if(dis_matrix[i][j] == 0):
                        L_matrix[i][j] = 0
                    else:
                        L_matrix[i][j] = 1 / dis_matrix[i][j]
                else:
                    L_matrix[i][j] = 0

        for i in range(N):
            rowsum = 0
            for j in range(N):
                rowsum = rowsum + abs(L_matrix[i][j])
                if (j != i):
                    L_matrix[i][j] = -L_matrix[i][j]
                if (j == N - 1):
                    L_matrix[i][i] = rowsum
        threads.append(L_matrix)
    return threads     #returns all Laplacian matrixs for each stage


def initLmatrix(threads, timesteps):
    N = threads
    timeslots = timesteps
    threads = []
    # initial the similarity matrix of threads
    for t in range(timeslots):
        b = []
        b = np.random.rand(N, N)
        b_symm = (b + b.T) / 2
        np.fill_diagonal(b_symm, 0)

        for i in range(N):
            rowsum = 0
            for j in range(N):
                # b_symm[i][j] = -0.1
                rowsum = rowsum + abs(b_symm[i][j])
                if (j != i):
                    b_symm[i][j] = -b_symm[i][j]
                    # b_symm[i][j] = -0.1 #for test
                if (j == N - 1):
                    b_symm[i][i] = rowsum  # - 0.1
        threads.append(b_symm)
    # print threads

    return threads


def calculateLmatrix(matrix):
    e_valsArray = []
    e_vecsArray = []
    for i in range(len(matrix)):
        e_vals, e_vecs = LA.eig(matrix[i])
        e_valsArray.append(e_vals)
        e_vecsArray.append(e_vecs)

    # need a proof for the correctness

    return e_valsArray, e_vecsArray


# intiate Y position
def initYpos(symmatrix):
    posArray = []
    e_valsAry, e_vecsAry = calculateLmatrix(symmatrix)

    for t in range(len(e_vecsAry)):
        pos = calcuYpos(e_vecsAry[t], e_valsAry[t], 1)
        # e_vecsAry[t] = np.transpose(e_vecsAry[t]) #transpose to row array
        # value = e_valsAry[t].tolist()
        # pos = e_vecsAry[t][value.index(sort_val[t][1])]
        posArray.append(pos)  # no problem
    return posArray


# calculate new Y position
def calcuYpos(e_vecsin, e_valsin, init):
    sort_val = np.sort(e_valsin)
    e_vecsin = np.transpose(e_vecsin)
    value = e_valsin.tolist()
    if len(value)==1:
        init=0
    pos = e_vecsin[value.index(sort_val[init])]
    # for i in range(len(pos)):
    #     pos[i] = pos[i].real
    return pos


def calcuYpos_new(stage, pos_all):
    pos=copy.deepcopy(pos_all[stage])
    for cluster in range(len(pos)):
        target='c'+str(cluster)+'t'+str(stage)
        if link_group.has_key(target):
            source_list=link_group[target]
            prepos_sum=0
            weight_sum=0
            for item in source_list:
                source=item['source']
                weight=item['value']
                weight_sum+=weight
                source_info=re.split('[c t]',source)
                cluster_index=source_info[1]
                stage_index=int(source_info[2])
                if cluster_index=='*':
                    cluster_index=int(len(pos_all[stage_index])-1)
                else:
                    cluster_index=int(cluster_index)
                prepos=pos_all[stage_index][cluster_index]
                prepos_sum+=prepos*weight
            #normalize
            prepos_sum=prepos_sum/weight_sum*1.0

            pos[cluster] = alpha * pos[cluster] + (1 - alpha) * prepos_sum
        else:
            pos[cluster] = alpha * pos[cluster]
    return pos


# get the new laplace matrix
def getnewLmatrix(matrixs, t, pos):
    # print lmatrix, prepos, pos
    lmatrix=copy.deepcopy(matrixs[t])
    # alpha is defined here
    for i in range(len(lmatrix)):
        for j in range(len(lmatrix)):
            if (i != j):
                lmatrix[i][j] = alpha * lmatrix[i][j]
            else:
                target='c'+str(i)+'t'+str(t)
                if link_group.has_key(target):
                    source_list=link_group[target]
                    prepos_sum=0
                    weight_sum=0
                    for item in source_list:
                        source=item['source']
                        weight=item['value']
                        weight_sum+=weight
                        source_info=re.split('[c t]',source)
                        cluster_index=source_info[1]
                        stage_index=int(source_info[2])
                        if cluster_index=='*':
                            cluster_index=int(len(pos[stage_index])-1)
                        else:
                            cluster_index=int(cluster_index)
                        prepos=pos[stage_index][cluster_index]
                        prepos_sum+=prepos*weight
                    #normalize
                    prepos_sum=prepos_sum/weight_sum*1.0

                    lmatrix[i][i] = alpha * lmatrix[i][i] + (1 - alpha) * prepos_sum
                else:
                    lmatrix[i][i] = alpha * lmatrix[i][i]
    # print lmatrix
    return lmatrix


# get the energy calculation
def energyCal(matrix, pos):
    energySum = 0
    interenergy = 0
    transenergy = 0
    for t in range(len(matrix)):
        tempenergy = np.dot(pos[t], matrix[t])
        interenergy = interenergy + alpha * np.dot(tempenergy, np.transpose(pos[t]))
        if (t > 0):
            for i in range(len(pos[t])):
                target='c'+str(i)+'t'+str(t)
                if link_group.has_key(target):
                    source_list=link_group[target]
                    prepos_sum=0
                    weight_sum=0
                    for item in source_list:
                        source=item['source']
                        weight=item['value']
                        weight_sum+=weight
                        source_info=re.split('[c t]',source)
                        cluster_index=source_info[1]
                        stage_index=int(source_info[2])
                        if cluster_index=='*':
                            cluster_index=int(len(pos[stage_index])-1)
                        else:
                            cluster_index=int(cluster_index)
                        prepos=pos[stage_index][cluster_index]
                        prepos_sum+=prepos*weight
                    #normalize
                    prepos_sum=prepos_sum/weight_sum*1.0
                else:
                    prepos_sum=0
                transenergy = transenergy + (1 - alpha) * ((pos[t][i] - prepos_sum) ** 2)
    energySum = interenergy + transenergy
    return energySum


#def main(fpath,filter):
def layout(fs_vectors,sankeyObj):
#    with open(fpath) as data_file:
#        data = json.load(data_file)
#
#    threads = len(data['threads'])
#    timesteps = len(data['threads'][0]['stamps'][filter])

    #print threads, timesteps
#    fs_vectors = getvectorsArray(threads, timesteps,data,filter)

    links=sankeyObj['links']
#with open('sankey.json','r') as f:
#        links=json.load(f)['links']

    link_group_target={}
    link_group_source={}

    for item in links:
        link_group_target.setdefault(item['target'], []).append(item)

    for item in links:
        link_group_source.setdefault(item['source'], []).append(item)

    timesteps=len(fs_vectors)

    # threads = 5  # thread number
    # timesteps = 5  # timesteps
    threshold = 1e-3

    energySum = 0  # count the energy
    stopcnt = 0  # count the stop time
    cycle = 0  # count the cycle time

    symmatrix = initLmatrix_new(timesteps, fs_vectors)

    inipos = initYpos(symmatrix)
    pos = initYpos(symmatrix)
    testPosarray = []
    preenergy = 0

    while (stopcnt < 1):
        cycle = cycle + 1
        temp = []

        for t in range(1, len(symmatrix)):
            global link_group
            link_group=copy.deepcopy(link_group_target);
            newl = getnewLmatrix(symmatrix, t , pos)
            # symmatrix[t] = newl
            ne_vals, ne_vecs = LA.eig(newl)
            # npos = calcuYpos(ne_vecs, ne_vals, 0)
            npos = calcuYpos_new(t, pos)
            pos[t] = npos

        for t in xrange(len(symmatrix) - 2, -1, -1):
            global link_group
            link_group=copy.deepcopy(link_group_source);
            newl_r = getnewLmatrix(symmatrix, t, pos)
            # symmatrix[t] = newl_r
            ne_valsr, ne_vecsr = LA.eig(newl_r)
            # npos_r = calcuYpos(ne_vecsr, ne_valsr, 0)
            npos_r = calcuYpos_new(t, pos)
            pos[t] = npos_r

        curenergy = energyCal(symmatrix, pos)
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
            if (cycle == 1):
                pos[k] = pos[k].tolist()
            temp.append(copy.deepcopy(pos[k]))

        testPosarray.append(temp) # for testing, I write all cycle data

    # print out

    return testPosarray

#layout=main()
#
#with open('layout_cluster.json','w') as f:
#    json.dump(layout[-1],f)
# if __name__=="__main__":
#     with open("stage_vec.json",'rb') as f:
#       stage_vec = json.load(f)
#
#     with open("sankeyobj.json",'rb') as f:
#       sankeyObj = json.load(f)
#
#     cluster_layout=layout(stage_vec,sankeyObj)
