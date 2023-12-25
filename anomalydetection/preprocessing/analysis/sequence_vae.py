from LstmVAE import LSTM_Var_Autoencoder
# from LstmVAE import preprocess
import tensorflow as tf
import json
import numpy as np


with open('./data/train_day.json', 'r') as file:
    data = json.load(file)

df = {}
patients = {}
count = 0
for idx, d in data.items():
    df[idx] = d['input']

    if d['length'] in patients:
        patients[d['length']].append(idx)
    else:
        patients[d['length']]= [idx]

length_set = {}
length_set[15] = []

for idx, seq in df.items():
    if len(seq) < 15:
        if len(seq) in length_set:
            length_set[len(seq)].append(seq)
        else:
            length_set[len(seq)] = [seq]
    else:
        for i in range(len(seq) - 14):
            length_set[15].append(seq[i:i + 15])

counting_class = np.zeros(87)
counting_day = 0

for length, sset in length_set.items():
    sset = list(sset)
    for p in sset:
        for day in p:
            counting_day += 1
            for k in range(87):
                if day[k] == 1:
                    counting_class[k] += 1
print(counting_class)
print(counting_day)
pos_weight = np.power(counting_day,1)/np.power(counting_class,1)-1
print(pos_weight)

vae = LSTM_Var_Autoencoder(intermediate_dim = 300, z_dim = 16, n_dim=87, stateful = False)

vae.fit(pos_weight, length_set, df, learning_rate=0.001, batch_size = 100, num_epochs = 300, opt = tf.train.AdamOptimizer, REG_LAMBDA = 0.01, grad_clip_norm = 10, optimizer_params = None, verbose = True)