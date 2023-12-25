import json


with open('./data/data_87.json','r') as f:
    data = json.load(f)

event_set = []

event2idx = {}

seqs = {}

# print(len(data.items()))

for id, p in data.items():
    admits = p['event']
    for admit in admits:
        for e in admit:
            if e in event_set:
                continue;
            else:
                event_set.append(e)

event_set = sorted(event_set)

num_event = len(event_set)
print(num_event)

for idx, e in enumerate(event_set):
    event2idx[e] = idx

with open('./data/event2idx.json','w') as f:
    json.dump(event2idx,f)

count = 0

patients = {}

for id,p in data.items():
    admits = p['event']
    seqs[id] = {'input': [], 'length': len(admits)}

    for admit in admits:
        temp = [0 for i in range(num_event)]
        for e in admit:
            temp[event2idx[e]]=1
        seqs[id]['input'].append(temp)

    # for k in range(len(seqs[str(count)]['input']), 500):
    #     temp = [0 for i in range(num_event)]
    #     seqs[str(count)]['input'].append(temp)

    count += 1

with open('./data/train_day.json','w') as f:
    json.dump(seqs,f)




