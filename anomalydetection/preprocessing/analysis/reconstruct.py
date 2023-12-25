from LstmVAE import LSTM_Var_Autoencoder
import tensorflow as tf
import json
import numpy as np
from tqdm import tqdm
import copy

import pickle


# count = 0
# df = []
# for idx, d in data.items():
#     df.append(d['input'])


class MyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        else:
            return super(MyEncoder, self).default(obj)

def seq2onehot(seq):
    with open('../data/event2idx.json', 'r') as f:
        event2idx = json.load(f)
    num_event=len(event2idx.keys())
    onehots = []
    for day in seq:
        temp = [0 for i in range(num_event)]
        for e in day:
            temp[event2idx[str(e)]] = 1
        onehots.append(temp)
    return onehots

def reconstruct(seq, num_sample):
    df = [seq]
    vae = LSTM_Var_Autoencoder(intermediate_dim = 300, z_dim = 16, n_dim=87, stateful = False)
    final = []
    for n in range(num_sample):
        results, errors = vae.reconstruct(df)
        final.append(results[0])
    final = np.mean(final,0)
    final = final
    return final

def latent(num_sample):
    with open('./data/train_day.json', 'r') as file:
        data = json.load(file)
    df = []
    id_list = []
    for idx, d in data.items():
        id_list.append(idx)
        for k in range(num_sample):
            df.append(d['input'])

    vae = LSTM_Var_Autoencoder(intermediate_dim=300, z_dim=16, n_dim=87, stateful=False)
    results = vae.reduce(df)
    final = {}
    for n, idx in enumerate(id_list):
        p_result = np.mean(results[n*num_sample:(n+1)*num_sample],0)
        final[idx] = copy.deepcopy(p_result.tolist())
    # with open('./data/latent_vector.pkl','wb') as f:
    #     pickle.dump(final,f)
    return final

def calDistance(vec1,vec2):
    distance=np.linalg.norm(np.array(vec1)-np.array(vec2))
    return distance

def calMeanSeq(seq,sample_num):
    onehot_vec=seq2onehot(seq)
    return reconstruct(onehot_vec,sample_num)

if __name__ == '__main__':

    # latent(5)
    meanseqs={}
    seqs=json.load(open('../data/data.json','r'))
#    abpids=json.load(open('../data/select_id.json','r'))
#    for pid,dat in tqdm(seqs.items()):
#        if pid in abpids:
#            meanseq=calMeanSeq(dat['event'],10)
#            meanseqs[pid]=meanseq
#    json.dump((meanseqs,open('../data/mean.json','w')))
    
    latent_vecs=pickle.load(open('data/latent_vector.pkl','rb'))
#    for key in seqs.keys():
#        onehot=seq2onehot(seqs[key]['event'])
#        latent_vecs[key]=latent(onehot,10)
#    
    distances={}
    for key,dat in tqdm(seqs.items()):
        distances[key]={}
        for _key,_dat in seqs.items():
            if _key==key:
                distances[key][_key]=0
                continue
            elif _key in distances.keys():
                distances[key][_key]=distances[_key][key]
                continue
            dis=calDistance(latent_vecs[key],latent_vecs[_key])
            distances[key][_key]=dis
    pickle.dump(distances,open('distances','wb'))
    