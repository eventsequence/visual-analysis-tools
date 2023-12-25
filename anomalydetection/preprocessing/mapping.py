import pandas as pd
import math

patient_fpath = '../../DAT/patient.xlsx'
patient = pd.read_excel(patient_fpath)

lab_fpath = '../../DAT/test'
treat_fpath = '../../DAT/treatment'

down_unicode = b'\xe2\x86\x93'
up_unicode = b'\xe2\x86\x91'

idx2id = []
adid2id={}
rid2idx = {}

#map detailed event type to high level cat
lab_map={}
treat_map={}

idx2labmap=[]
idx2treatmap=[]
labmap2idx={}
treatmap2idx={}

idx2act = ['ADMIT','DISCHARGE']
act2idx={'ADMIT':0,'DISCHARGE':1}
idx2type=['admit','test','treatment']
aidx2type=[0,0]

def isnan(x):
    if isinstance(x,float) and math.isnan(x):
        return True
    else:
        return False
    
def isNormal(x):
    if x.split('-')[-1]=='H' or x.split('-')[-1]=='L':
        return False
    else:
        return True

#preprocessing patient id
for row in range(0,patient.shape[0]):
    rid=patient.iat[row,14]
    adid=patient.iat[row,3]
    if not isnan(rid) and not isnan(adid):
        if rid not in idx2id:
            idx2id.append(rid)
            rid2idx[rid]=len(idx2id)-1
        adid2id[adid]=rid2idx[rid]

#preprocessing labtest    
for fid in range(1,9):
    fpath=lab_fpath + '_' + str(fid) + '.xlsx'
    lab_dat=pd.read_excel(fpath)
    for row in range(0,lab_dat.shape[0]):
        t_type=lab_dat.iat[row,4]
        t_item=lab_dat.iat[row,5]
        t_result=lab_dat.iat[row,9]
        if isnan(t_type):
            continue
        elif isnan(t_item):
            entry = t_type
        else:
            entry= t_type + '-' + t_item
        if t_result.encode('utf-8')==up_unicode:
            entry+='-H'
        elif t_result.encode('utf-8')==down_unicode:
            entry+='-L'
            
        if entry not in idx2act:
            idx2act.append(entry)
            if isNormal(entry):
                mapped_entry=t_type+'-N'
            else:
                mapped_entry=t_type+'-A'
            lab_map[entry]=mapped_entry
            if mapped_entry not in idx2labmap:
                idx2labmap.append(mapped_entry)
                labmap2idx[mapped_entry]=len(idx2labmap)-1
                
            act2idx[entry]=len(idx2act)-1
            aidx2type.append(1)

#preprocessing treatment 
for fid in range(1,4):
    fpath=treat_fpath + '_' + str(fid) + '.xlsx'
    treat_dat = pd.read_excel(fpath)
    for row in range(0,treat_dat.shape[0]):
        treatment = treat_dat.iat[row,5]
        if not isnan(treatment):
            if treatment not in idx2act:
                idx2act.append(treatment)
                act2idx[treatment]=len(idx2act)-1
                aidx2type.append(2)
            


    
    
    
    

    

    
    
    
    
