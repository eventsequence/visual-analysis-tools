import pickle
import json

data_p = pickle.load(open('../dat/query.seq','rb'))
data = {'event':[],'time':[]}

e = []
for pid,dat in data_p.items():
    for i in range(len(dat['event'])):
        for j in range(len(dat['event'][i])):
            if dat['event'][i][j] in e:
                continue
            else:
                e.append(dat['event'][i][j])
s_e = sorted(e)
mapping = {}
for i, item in enumerate(s_e):
    mapping[item] = i+1

max_time = 0
max_length = 0
for pid,dat in data_p.items():
    p_e = []
    p_t = []
    for i in range(len(dat['event'])):
        for j in range(len(dat['event'][i])):
            p_e.append(mapping[dat['event'][i][j]])
            interval = (dat['time'][i][j]-dat['time'][0][0])/(3600*24*7)
            p_t.append(interval)
            if interval>max_time:
                max_time = interval
    if len(p_e) > max_length:
        max_length = len(p_e)
    data['event'].append(p_e)
    data['time'].append(p_t)

print(s_e)
print(int(max_time)+1)
print(max_length)
# with open('../dat/mapping.json','w') as f:
#     json.dump(mapping,f)
with open('../analysis/Hawkes-Process-Toolkit-master/data.json','w+') as f:
    json.dump(data,f)


