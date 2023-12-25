import json
from scipy.spatial.distance import euclidean
from sklearn import preprocessing
import numpy as np
# from fastdtw import fastdtw

def distance(cur_vector, all_vectors):
    dist_vec=[]
    for i,vec in enumerate(all_vectors):
        distance = np.linalg.norm(cur_vector - vec)
        # distance, path = fastdtw(cur_vector, vec, dist=euclidean)
        # distance =  float('%.3f' % distance)
        dist_vec.append(distance)
    return dist_vec

if __name__=="__main__":
    with open('../../data/allpatients.json', 'r') as f:
        all_patients = json.load(f)
    with open('../../data/vectors.json', 'r') as f:
        json_obj = json.load(f)
        vocab = json_obj['vocab']
        evec=json_obj['evec']

    all_vectors = []
    for patient in all_patients:
        events = patient['code_string'].split('|')
        seq_vec = []
        for event in events:
            index = vocab.index(event)
            seq_vec.append(evec[index])
        p_vector = np.mean(np.array(seq_vec), axis=0)
        all_vectors.append(p_vector)

    print 'load finished'

    distance_matrix = []
    for i in range(len(all_patients)):
        print i
        cur_vector = all_vectors[i]
        distance_vector = distance(cur_vector, all_vectors)
        distance_matrix.append(distance_vector)
    # for patient in all_patients:
    #     events = patient['code_string'].split('|')
    #     seq_vec = []
    #     for event in events:
    #         index = vocab.index(event)
    #         seq_vec.append(evec[index])
    #     all_vectors.append(seq_vec)

    # print 'load finished'

    # distance_matrix = []
    # for i in range(len(all_patients)):
    #     print 'start'
    #     print i
    #     cur_vector = all_vectors[i]
    #     distance_vector = distance(cur_vector, all_vectors)
    #     distance_matrix.append(distance_vector)
    distance_matrix = preprocessing.normalize(distance_matrix, norm='max')

    matrix_shape = np.shape(distance_matrix)
    print "matrix shape is:", matrix_shape
    for i in range(matrix_shape[0]):
        # produce dis_list
        print i
        dis_list = []
        for j in range(matrix_shape[1]):
            distance = distance_matrix[i][j]
            distance = float('%.3f' % distance)
            dis_list.append({
                'pid': all_patients[j]['pid'],
                'dist': distance,
                'major_events': all_patients[j]['major_events']
            })
        current_seq = all_patients[i]
        patientsinfo = {
            'pid': current_seq['pid'],
            'gender': current_seq['gender'],
            'major_events': current_seq['major_events'],
            'dis_list': dis_list
        }
        with open('../../data/patientsinfo/' + str(current_seq['pid']) + '.json', 'w') as f:
            json.dump(patientsinfo,f)
