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
import json
import time
import numpy as np


if __name__ == '__main__':

    t_code = {}
    Disease = []
    with open("../data/train_12.json") as f:
        Train = json.load(f)

    Marks = Train[0]
    Dates = Train[1]
    Codes = Train[2]
    Death = Train[3]

    print 'Converting strSeqs to intSeqs, and making types'
    types = {}
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
                types[code_list[e]] = mark_list[e]

    with open("../../data/disease.json",'wb') as f:
        json.dump(Disease,f)

    with open("../../data/type.json",'wb') as f:
        json.dump(types,f)

    pickle.dump(types, open("../../data/mimic.types",'wb'),-1)


