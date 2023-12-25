import sys, json,os
sys.path.append(os.path.abspath('./retain-api'))
import test_retain
import numpy as np
import copy
from datetime import datetime,timedelta
import time


def computed(patient):

    path = './retain-api/'
    pre, contributions = test_retain.train_RETAIN(
        modelFile=path + 'model/mimic.9.npz',
        patient=patient,
        typeFile=path + 'data/mimic.types',
        useLogTime=True,
        embFile = '',
        logEps=1e-8
	)
    max_arr = np.amax(np.array(pre), axis=0)

    return max_arr

def get_duration_list(event_time_list):
    duration_list = []
    dates = [datetime.strptime(x, '%Y-%m-%d %H:%M:%S') for x in event_time_list]
    pred_date = dates[-1] + timedelta(days=30)
    durations = [(pred_date - d) for d in dates]
    durations = [(d.days + float(d.seconds)/(24*60*60)) for d in durations]
    duration_list.append(durations)
    for i in range(1, 12):
        follow_dur = [d + i* 30 for d in durations]
        duration_list.append(follow_dur)
    print len(duration_list)
    return duration_list

def insert_duration(duration_list, insert_idx):
    new_duration = copy.deepcopy(duration_list)
    for dura in new_duration:
        avg = (dura[insert_idx-1]+dura[insert_idx])/2
        dura.insert(insert_idx, avg)
    return new_duration
    

def move_event(i, j, mark_list, duration_list, time_num,cur_result):
    print i, ' ',j
    results = []
    orders = []
    new_mark_list = copy.deepcopy(mark_list)
    move_event_code = new_mark_list[i].pop(j)
    for bias in range(-3, 4):
        if 0 <= i + bias < time_num:
            orders.append(bias)
            if bias == 0:
                results.append(cur_result)
            else:
                tmp_mark_list = copy.deepcopy(new_mark_list)
                if bias < 0:
                    tmp_mark_list.insert(i+bias+1,[move_event_code])
                    tmp_duration = insert_duration(duration_list, i+bias+1)
                    if len(tmp_mark_list[i+1])==0:
                        print 'single..'
                        tmp_mark_list.pop(i+1)
                        for dura in tmp_duration:
                            dura.pop(i+1)
                else:
                    tmp_mark_list.insert(i+bias,[move_event_code])
                    tmp_duration = insert_duration(duration_list, i+bias)
                    if len(tmp_mark_list[i])==0:
                        print 'single..'
                        tmp_mark_list.pop(i)
                        for dura in tmp_duration:
                            dura.pop(i)

                tmp_mark_arr = [tmp_mark_list for x in range(12)]
                computed_result = computed([tmp_mark_arr, tmp_duration])
                results.append(computed_result)

    results = np.transpose(np.array(results))
    return results.tolist(), orders.index(0)

def calculate_correlation(patient_seq, file):

    group_list = []
    event_time_list = []
    mark_list = []
    last_time = ''
    for i in range(len(patient_seq)):
        cur_time = patient_seq[i]['event_time']
        if last_time == cur_time:
            if patient_seq[i]['event_code'] in mark_list[-1]: continue
            group_list[-1].append(patient_seq[i])
            mark_list[-1].append(patient_seq[i]['event_code'])
        else:
            event_time_list.append(cur_time)
            group_list.append([])
            mark_list.append([])
            group_list[-1].append(patient_seq[i])
            mark_list[-1].append(patient_seq[i]['event_code'])
            last_time = cur_time


    duration_list = get_duration_list(event_time_list)
    mark_arr = [mark_list for x in range(12)]
    cur_result = computed([mark_arr, duration_list])

    time_num = len(event_time_list)
    # print mark_list
    print 'prepare finished'
    print time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    
    # compute
    correlation_list = []
    for i in range(len(group_list)):
        for j in range(len(group_list[i])):
            if group_list[i][j]['event_type'] == 'Treatments':
                results, cur_pos = move_event(i,j, mark_list, duration_list, time_num,cur_result)
                print 'moved'
                print time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) 
                correlation_list.append({
                    'icd_code': group_list[i][j]['icd_code'],
                    'results': results,
                    'cur_pos': cur_pos
                })
                # print correlation_list
                # break
    Disease = ["584", "560", "401", "418", "599", "384", "459", "585", "411", "579", "537", "427", "428", "424", "365", "410", "455", "507", "571", "553", "518", "443", "440", "593", "578", "396", "458", "557", "425", "416", "494", "552", "576", "492", "484", "573", "457", "572", "512", "511", "447", "414", "426", "437", "397", "517", "487", "577", "441", "442", "381", "567", "421", "456", "423", "482", "519", "536", "530", "395", "453", "527", "568", "581", "528", "583", "510", "556", "594", "592", "543", "540", "446", "555", "558", "366", "478", "432", "413", "564", "389", "465", "588", "438", "394", "435", "483", "575", "596", "369", "565", "529", "461", "569", "454", "391", "466", "513", "495", "480", "380", "531", "429", "516", "368", "547", "595", "582", "525", "444", "491", "408", "522", "473", "506", "589", "598", "597", "523", "361", "532", "541", "383", "420", "477", "415", "580", "422", "551", "382", "451", "526", "590", "417", "373", "508", "472", "544", "488", "471", "388", "364", "379", "520", "370", "448", "474", "378"]
    correlation_obj = {
        'result_names': Disease,
        'correlation': correlation_list
    }
    return correlation_obj


if __name__ == '__main__':
    path = './sequences/'
    files = os.listdir(path)
    for file in files:
        with open(path+file, 'r') as f:
            patient_seq = json.load(f)
        correlation = calculate_correlation(patient_seq,file)
        with open('./correlation/'+file, 'w') as f:
            json.dump(correlation, f)
