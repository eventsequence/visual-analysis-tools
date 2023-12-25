import json

# if __name__ == "__main__":
    # all_disease_obj = {}
    # with open ('../data/dict.text', 'r') as f:
    #     for line in f:
    #         line = line.strip()
    #         splited_list = line.split(' ')
    #         icd_code = splited_list[0]
    #         icd_code = icd_code.split('.')[0]
    #         label = ' '.join(splited_list[1:])
    #         print icd_code
    #         print label
    #         if icd_code in all_disease_obj.keys():
    #             continue
    #         all_disease_obj[icd_code] = label
    # print all_disease_obj

    # with open('../data/disease.json', 'r') as f:
    #     dis_idx_list = json.load(f)
    # disease_obj = {}
    # for idx in dis_idx_list:
    #     if idx not in all_disease_obj.keys():
    #         print idx
    #         continue
    #     disease_obj[idx] = all_disease_obj[idx]

    # print disease_obj
    # with open('../../data/disease_dict.json', 'w') as f:
    #     json.dump(disease_obj, f)


if __name__ == "__main__":
    all_disease_obj = {}
    with open('../data/D_ICD_DIAGNOSES.csv', 'r') as f:
        for line in f:
            line = line.strip()
            splited_list = line.split(',')
            icd_code = splited_list[0]
            icd_code = icd_code[:3]
            label = " ".join(splited_list[1:])
            print icd_code
            print label
            if icd_code in all_disease_obj.keys():
                continue
            all_disease_obj[icd_code] = label
    with open('../data/disease.json', 'r') as f:
        dis_idx_list = json.load(f)
    disease_obj = {}
    print '================================'
    for idx in dis_idx_list:
        if idx not in all_disease_obj.keys():
            print idx
            continue
        disease_obj[idx] = all_disease_obj[idx]

    # print disease_obj
    with open('../../data/disease_dict.json', 'w') as f:
        json.dump(disease_obj, f)
