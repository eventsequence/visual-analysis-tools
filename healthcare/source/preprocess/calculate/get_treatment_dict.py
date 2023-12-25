import pandas as pd
import json

if __name__ == '__main__':
    treatments_obj = {}
    with open('../data/treatment 3.txt', 'r') as f:
        for line in f:
            splited_list = line.strip().split('|')
            icd_code = splited_list[0]
            if icd_code == 'ITEMID': continue
            label = splited_list[2]
            treatments_obj[icd_code] = label
    # print len(label_list)
    # treatments_obj = {}
    # for i in range(len(icd_code_list)):
    #     icd_code = icd_code_list[i]
    #     treatments_obj[icd_code] = label_list[i]
    with open('../../data/treatment_dict.json', 'w') as f:
        json.dump(treatments_obj, f)
