# This script processes MIMIC-III dataset and builds longitudinal diagnosis records for patients with at least two visits.
# The output data are cPickled, and suitable for training Doctor AI or RETAIN
# Written by Edward Choi (mp2893@gatech.edu)
# Usage: Put this script to the foler where MIMIC-III CSV files are located. Then execute the below command.
# python process_mimic.py ADMISSIONS.csv DIAGNOSES_ICD.csv PATIENTS.csv <output file> 

# Output files
# <output file>.pids: List of unique Patient IDs. Used for intermediate processing
# <output file>.morts: List of binary values indicating the mortality of each patient
# <output file>.dates: List of List of Python datetime objects. The outer List is for each patient. The inner List is for each visit made by each patient
# <output file>.seqs: List of List of List of integer diagnosis codes. The outer List is for each patient. The middle List contains visits made by each patient. The inner List contains the integer diagnosis codes that occurred in each visit
# <output file>.types: Python dictionary that maps string diagnosis codes to integer diagnosis codes.

import sys
import cPickle as pickle
from datetime import datetime
from sklearn.cluster import spectral_clustering
import json
import time
import numpy as np
from collections import Counter



if __name__ == '__main__':

	t_code = {}
	Disease = []
	outFile = 'data/mimic'
	with open("train_12.json") as f:
		Train = json.load(f)

	Marks = Train[0]
	Dates = Train[1]
	Codes = Train[2]
	Death = Train[3]
	print 'Building pid-sortedVisits mapping'
	pidSeqMap = {}
	max = 0
	for p in range(len(Marks)):
		pid = p
		mark_list = Marks[p]
		date_list = Dates[p]
		code_list = Codes[p]

		admIdList = []
		admDateMap = []
		admCode = []
		admlength = 0
		for e in range(len(mark_list)):
			if int(mark_list[e])>max:
				max=int(mark_list[e])
				# print 'max'
				# print max

			if e == 0:
				admlength += 1
				admTime = time.strptime(date_list[e], '%Y-%m-%d %H:%M:%S')
				admTime = int(time.mktime(admTime)) / (3600.0 * 24.0)
				admIdList.append([int(mark_list[e])])
				admCode.append([code_list[e]])
				admDateMap.append(admTime)
			else:
				if date_list[e] == date_list[e-1]:
					admIdList[-1].append(int(mark_list[e]))
					admCode[-1].append(code_list[e])
				else:
					admlength += 1
					admTime = time.strptime(date_list[e], '%Y-%m-%d %H:%M:%S')
					admTime = int(time.mktime(admTime)) / (3600.0 * 24.0)
					admIdList.append([int(mark_list[e])])
					admCode.append([code_list[e]])
					admDateMap.append(admTime)
		sortedList = sorted([(admDateMap[i], admIdList[i], admCode[i]) for i in range(admlength)])
		if len(sortedList)<1000:
			pidSeqMap[pid] = sortedList

	print 'Converting strSeqs to intSeqs, and making types'
	types = {}
	Treat = []
	Treat_dict = {}
	for p in range(len(Marks)):
		newPatient = []
		mark_list = Marks[p]
		code_list = Codes[p]
		for e in range(len(mark_list)):
			if code_list[e] in types:
				continue
			else:
				if len(code_list[e])<4:
					Disease.append(code_list[e])
					# print code_list[e]
				else:
					Treat.append(mark_list[e])
				types[code_list[e]] = mark_list[e]
	# print "Treat"
	# print len(Treat)
	mat = np.zeros((len(Treat),len(Treat)))
	for idx,treat in enumerate(Treat):
		Treat_dict[int(treat)] = idx
	# print Treat_dict
	# print "length"
	# print len(Disease)
	# with open("treatdict.json") as f:
	# 	json.dump(Treat_dict,f)

	with open("disease.json",'wb') as f:
		json.dump(Disease,f)

	with open("type.json",'wb') as f:
		json.dump(types,f)

	print 'Building pids, dates, mortality_labels, strSeqs'
	dates = []
	seqs = []
	morts = []
	seq_codes = []

	mortsnew = []
	for d in Disease:
		mortsnew.append(0)
	d_sample = []
	for d in Disease:
		d_sample.append(0)

	p_index = 0

	for pid, visits in pidSeqMap.iteritems():

		print pid
		
		seq = []
		date = []
		seq_code = []

		hf_his = []
		tre_his = []
		for iii,visit in enumerate(visits):
			d_flag = 0
			merge_list = []
			mort = []
			for d in Disease:
				mort.append(0)
			# mort = 0
			treatment = 0

			for ii in reversed(range(len(visit[2]))):
				if len(visit[2][ii]) <4:
					d_flag = 1
					# if int(visit[2][ii])>=390 and int(visit[2][ii])<=392: mort[0] = 1
					# if(int(visit[2][ii])>=393 and int(visit[2][ii])<=398): mort[0] = 1

					mort[Disease.index(visit[2][ii])] = 1
					# visit[1].pop(ii)
				if len(visit[2][ii]) == 6: treatment = 1

			mk = -1
			for idx,d in enumerate(date):
				if (visit[0] - d)<540:
					mk = idx
					break
			# if d_flag == 1 : p_index += 1
			if d_flag == 1 and mk>=0:
				fff = 0
				for ii in range(len(Disease)):
					if len(seq[mk:]) > 400:
						if np.sum(x[ii] for x in hf_his[-400:])>0:

							if np.sum(tre_his[-400:])>0:
								if 0 == mort[ii]:
									mortsnew[ii] += 1
									d_sample[ii] += 1
								else:
									d_sample[ii] += 1
					else:
						if np.sum(x[ii] for x in hf_his[mk:])>0:

							if np.sum(tre_his[mk:])>0:
								if 0 == mort[ii]:
									mortsnew[ii] += 1
									d_sample[ii] += 1
								else:
									d_sample[ii] += 1



			if(len(visit[1]) > 0):
				date.append(visit[0])
				seq.append(visit[1])
				seq_code.append(visit[2])
				hf_his.append(mort)
				tre_his.append(treatment)
	cue = []
	for i in range(len(mortsnew)):
		if int(Disease[i])>400 and int(Disease[i])<418:
			if d_sample[i]==0:
				cue.append({'d':Disease[i],'cue':0, 'num': d_sample[i]})
			else:
				cue.append({'d':Disease[i], 'cue': mortsnew[i]*1.0/d_sample[i], 'num': d_sample[i]})


	print sorted(cue, key=lambda d: d['cue'])

	print sorted(cue, key=lambda d: d['d'])
	# m = [len(seq) for seq in seqs]
	# print np.where(np.max(m) == m)
	# print(dates[4487])
	# m = [[np.max(s) for s in seq] for seq in seqs]
	# mm = np.max([np.max(k) for k in m])
	# print mm
	# print t_code
	# print p_index
	# print len(morts) == len(seqs)

	# for i in range(len(morts)):
	# 	if 0 in morts[i]:
	# 		print i,seq_codes[i]
	# print mat[0]
	# mat = np.log(mat+1)
	# label = spectral_clustering(affinity=mat, n_clusters=8)
	# print label
	# print Counter(label).most_common(8)

	# pickle.dump(mat,open(outFile+'.mat', 'wb'), -1)
