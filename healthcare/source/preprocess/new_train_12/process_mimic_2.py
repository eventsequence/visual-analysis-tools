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
	Pids = Train[4]
	print 'Building pid-sortedVisits mapping'
	pidSeqMap = {}
	max = 0
	for p in range(len(Marks)):
		pid = Pids[p]
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
		
		pidSeqMap[pid] = sortedList

	print 'Converting strSeqs to intSeqs, and making types'
	types = {}
	Treat = []
	Treat_icd = []
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
					Treat_icd.append(code_list[e])
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

	seqsnew = []
	datesnew = []
	mortsnew = []
	pidsnew = []

	p_index = 0
	for pid, visits in pidSeqMap.iteritems():
		
		seq = []
		date = []
		seq_code = []

		seqnew = []
		mortnew = [0,0,0,0,0,0,0]
		datenew = []

		for visit in visits:
			datenew.append(visit[0])
			seqnew.append(visit[1])
			for ii in range(len(visit[1])):
				if (int(visit[2][ii]) >= 401 and int(visit[2][ii]) <= 405):
					mortnew[0] = 1
				elif (int(visit[2][ii]) >= 410 and int(visit[2][ii]) <= 414):
					mortnew[1] = 1
				elif (int(visit[2][ii]) >= 415 and int(visit[2][ii]) <= 417):
					mortnew[2] = 1
				elif (int(visit[2][ii]) >= 420 and int(visit[2][ii]) <= 429):
					mortnew[3] = 1
				elif (int(visit[2][ii]) >= 430 and int(visit[2][ii]) <= 438):
					mortnew[4] = 1
				elif (int(visit[2][ii]) >= 440 and int(visit[2][ii]) <= 448):
					mortnew[5] = 1
				elif (int(visit[2][ii]) >= 451 and int(visit[2][ii]) <= 459):
					mortnew[6] = 1

		mortsnew.append(mortnew)
		datesnew.append(datenew)
		seqsnew.append(seqnew)
		pidsnew.append(pid)

		hf_his = []
		tre_his = []
		for iii,visit in enumerate(visits):
			d_flag = 0
			merge_list = []
			mort = [0,0,0,0,0,0,0]
			# mort = 0
			treatment = 0
			head = iii
			tail = iii+1
			for k in reversed(range(iii)):
				if visits[iii][0] - visits[k][0]>0.25:
					head = k
					break
			for k in range(iii+1,len(visits)):
				if visits[k][0] - visits[iii][0]>0.25:
					tail = k
					break
	
			for l in range(head,tail): merge_list.extend(visits[l][1])
			for i in range(len(merge_list)):
				for j in range(len(merge_list)):
					if i != j and merge_list[i] in Treat_dict and merge_list[j] in Treat_dict:
						mat[Treat_dict[merge_list[i]]][Treat_dict[merge_list[j]]] += 1

			for ii in reversed(range(len(visit[2]))):
				if len(visit[2][ii]) <4:
					d_flag = 1
					# if int(visit[2][ii])>=390 and int(visit[2][ii])<=392: mort[0] = 1
					# if(int(visit[2][ii])>=393 and int(visit[2][ii])<=398): mort[0] = 1
					if(int(visit[2][ii])>=401 and int(visit[2][ii])<=405): mort[0] = 1
					elif(int(visit[2][ii])>=410 and int(visit[2][ii])<=414): mort[1] = 1
					elif(int(visit[2][ii])>=415 and int(visit[2][ii])<=417): mort[2] = 1
					elif(int(visit[2][ii])>=420 and int(visit[2][ii])<=429): mort[3] = 1
					elif(int(visit[2][ii])>=430 and int(visit[2][ii])<=438): mort[4] = 1
					elif(int(visit[2][ii])>=440 and int(visit[2][ii])<=448): mort[5] = 1
					elif(int(visit[2][ii])>=451 and int(visit[2][ii])<=459): mort[6] = 1
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
				for ii in range(7):
					if 1 == mort[ii]:
						# if fff == 0:
						if len(seq[mk:]) >400:
							if np.sum(tre_his[-400:])>0:
								seqs.append(seq[-400:])
								morts.append(mort)
								dates.append(date[-400:])
								seq_codes.append(seq_code[-400:])
							else:
								for _ in range(2):
									seqs.append(seq[-400:])
									morts.append(mort)
									dates.append(date[-400:])
									seq_codes.append(seq_code[-400:])
						else:

							if np.sum(tre_his[mk:])>0:
								seqs.append(seq[mk:])
								morts.append(mort)
								seq_codes.append(seq_code[mk:])
								dates.append(date[mk:])
							else:
								for _ in range(2):
									seqs.append(seq[mk:])
									morts.append(mort)
									seq_codes.append(seq_code[mk:])
									dates.append(date[mk:])
							# fff = 1

					else:


						if len(seq[mk:]) > 400:
							#print np.sum(hf_his[-400:00])
							if np.sum(x[ii] for x in hf_his[-400:])>0:
								if np.sum(tre_his[-400:])>0:
									for k in range(6):
										seqs.append(seq[-400:])
										morts.append(mort)
										dates.append(date[-400:])
										seq_codes.append(seq_code[-400:])

							else:
								# if fff == 0:
								seqs.append(seq[-400:])
								morts.append(mort)
								dates.append(date[-400:])
								seq_codes.append(seq_code[-400:])
									# fff  = 1

						else:
							# print ii
							# print hf_his[mk:]
							if np.sum(x[ii] for x in hf_his[mk:])>0:
								if np.sum(tre_his[mk:])>0:
									for k in range(6):
										seqs.append(seq[mk:])
										morts.append(mort)
										seq_codes.append(seq_code[mk:])
										dates.append(date[mk:])

							else:
								# if fff == 0:
								seqs.append(seq[mk:])
								morts.append(mort)
								seq_codes.append(seq_code[mk:])
								dates.append(date[mk:])
									# fff = 1

			if(len(visit[1]) > 0):
				date.append(visit[0])
				seq.append(visit[1])
				seq_code.append(visit[2])
				hf_his.append(mort)
				tre_his.append(treatment)


	print len(mortsnew)
	print np.sum(morts,axis = 0)
	print len(morts)	
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

	pickle.dump(mat,open(outFile+'.mat', 'wb'), -1)
	mat = np.log(mat+1)

	label = spectral_clustering(affinity = mat,n_clusters = 8)
	print label
	label = label.tolist()
	treat_set = []
	for i in range(8):
		treat_set.append([])
	for i, index in enumerate(label):
		treat_set[index].append(Treat_icd[i])

	with open("label.json","wb") as f:
	    json.dump(label,f)

	with open("../../data/treat_set.json",'wb') as f:
		json.dump(treat_set,f)

	with open("pids.json",'wb') as f:
		json.dump(pidsnew,f)

	pickle.dump(dates, open(outFile+'.dates', 'wb'), -1)
	pickle.dump(morts, open(outFile+'.morts', 'wb'), -1)
	pickle.dump(seqs, open(outFile+'.seqs', 'wb'), -1)
	pickle.dump(datesnew, open(outFile+'.datesnew', 'wb'), -1)
	pickle.dump(mortsnew, open(outFile+'.mortsnew', 'wb'), -1)
	pickle.dump(seqsnew, open(outFile+'.seqsnew', 'wb'), -1)
	pickle.dump(types, open(outFile+'.types', 'wb'), -1)
	pickle.dump(Treat,open(outFile+'.treat', 'wb'),-1)
