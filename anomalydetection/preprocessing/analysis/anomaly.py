from LstmVAE import LSTM_Var_Autoencoder
import tensorflow as tf
import json
import numpy as np
from sklearn.neighbors import LocalOutlierFactor
from sklearn import svm

with open('./data/train_day.json', 'r') as file:
    data = json.load(file)

df = []
count = 0
id_list = []

for idx, d in data.items():
    df.append(d['input'])
    id_list.append(idx)
    count += 1

vae = LSTM_Var_Autoencoder(intermediate_dim = 300, z_dim = 16, n_dim=87, stateful = False)

results = vae.reduce(df)

print(results)

final_result = {}

for i, idx in enumerate(id_list):
    final_result[idx] = results[i]

with open('./data/latent_vector.json','w') as f:
    json.dump(final_result,f)

# clf = svm.OneClassSVM(nu=0.15, kernel="rbf", gamma=0.1)
#
# # clf = LocalOutlierFactor(n_neighbors=20, contamination=0.1)
# y_pred = clf.fit(results).predict(results)
#
# test = results[::7]
#
# an = 0
#
# selected = []
#
# for i in range(len(y_pred)/7):
#     if sum(y_pred[7*i:7*(i+1)])<0:
#         selected.append(id_list[i])
#         print(id_list[i])
#         print(len(data[id_list[i]]['input']))
#         an += 1
#         print(y_pred[7*i:7*(i+1)])
#
# with open('./data/select_id.json','w') as f:
#     json.dump(selected,f)
#
# print(an*1.0/len(id_list))

