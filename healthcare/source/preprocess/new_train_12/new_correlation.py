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
    return duration_list

# def insert_duration(duration_list, insert_idx):
#     new_duration = copy.deepcopy(duration_list)
#     for dura in new_duration:
#         avg = (dura[insert_idx-1]+dura[insert_idx])/2
#         dura.insert(insert_idx, avg)
#     return new_duration
    

def move_event(i, j, mark_list, duration_list, time_num,cur_result):
    print i, ' ',j
    results = []
    new_mark_list = copy.deepcopy(mark_list)
    new_mark_list[i].pop(j)
    results.append(cur_result)
    tmp_duration = copy.deepcopy(duration_list)
    if len(new_mark_list[i])==0:
        print 'single..'
        new_mark_list.pop(i)
        for dura in tmp_duration:
            dura.pop(i)
    tmp_mark_arr = [new_mark_list for x in range(12)]
    computed_result = computed([tmp_mark_arr, tmp_duration])
    results.append(computed_result)

    results = np.transpose(np.array(results))
    return results.tolist()

def delete_event(event_code, mark_list, duration_list,cur_result):
    print event_code
    results = []
    results.append(cur_result)
    new_mark_list = copy.deepcopy(mark_list)
    tmp_mark_list = []
    for i in range(len(new_mark_list)):
        tmp_mark_list.append([])
        for j in range(len(new_mark_list[i])):
            if new_mark_list[i][j]!= event_code:
                tmp_mark_list[i].append(event_code)
    
    tmp_duration = copy.deepcopy(duration_list)
    for i in range(len(tmp_mark_list))[::-1]:
        if len(tmp_mark_list[i])==0:
            print 'single..'
            tmp_mark_list.pop(i)
            for dura in tmp_duration:
                dura.pop(i)
    tmp_mark_arr = [tmp_mark_list for x in range(12)]
    computed_result = computed([tmp_mark_arr, tmp_duration])
    results.append(computed_result)

    results = np.transpose(np.array(results))
    return results.tolist()

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
    sample = []
    cur_result = computed([mark_arr, duration_list])

    # time_num = len(event_time_list)
    # print mark_list
    print 'prepare finished'
    print time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

    treatment_event_list = []
    treatment_eventcode_list = []
    for i in range(len(group_list)):
        for j in range(len(group_list[i])):
            if group_list[i][j]['event_type'] == 'Treatments' and group_list[i][j]['event_code'] not in treatment_eventcode_list:
                treatment_event_list.append(group_list[i][j])
                treatment_eventcode_list.append(group_list[i][j]['event_code'])

    correlation_list = []
    for i in range(len(treatment_event_list)):
        event_code = treatment_event_list[i]['event_code']
        results = delete_event(event_code, mark_list, duration_list,cur_result)
        correlation_list.append({
            'icd_code': treatment_event_list[i]['icd_code'],
            'results': results
        })

    # correlation_obj = {
    #     'result_names': Disease,
    #     'correlation': correlation_list
    # }
    return correlation_list


if __name__ == '__main__':
    Disease = ["584", "560", "401", "418", "599", "384", "459", "585", "411", "579", "537", "427", "428", "424", "365", "410", "455", "507", "571", "553", "518", "443", "440", "593", "578", "396", "458", "557", "425", "416", "494", "552", "576", "492", "484", "573", "457", "572", "512", "511", "447", "414", "426", "437", "397", "517", "487", "577", "441", "442", "381", "567", "421", "456", "423", "482", "519", "536", "530", "395", "453", "527", "568", "581", "528", "583", "510", "556", "594", "592", "543", "540", "446", "555", "558", "366", "478", "432", "413", "564", "389", "465", "588", "438", "394", "435", "483", "575", "596", "369", "565", "529", "461", "569", "454", "391", "466", "513", "495", "480", "380", "531", "429", "516", "368", "547", "595", "582", "525", "444", "491", "408", "522", "473", "506", "589", "598", "597", "523", "361", "532", "541", "383", "420", "477", "415", "580", "422", "551", "382", "451", "526", "590", "417", "373", "508", "472", "544", "488", "471", "388", "364", "379", "520", "370", "448", "474", "378"]


    matrix_obj = {}

    path = './sequences/'
    files = os.listdir(path)
    for file in files:
        print file
        with open(path+file, 'r') as f:
            patient_seq = json.load(f)
        correlation = calculate_correlation(patient_seq,file)

        for item in correlation:
            icd_code = item['icd_code']
            results = item['results']
            if icd_code not in matrix_obj.keys():
                matrix_obj[icd_code] = []
                for i in range(len(Disease)):
                    matrix_obj[icd_code].append({
                        'prob': [],
                        'del_prob': []
                    })
            for i in range(len(Disease)):
                prob = results[i][0]
                del_prob = results[i][1]
                matrix_obj[icd_code][i]['prob'].append(prob)
                matrix_obj[icd_code][i]['del_prob'].append(del_prob)

    with open('./matrix_obj.json', 'w') as f:
        json.dump(matrix_obj, f)

    boxplot_obj = {}
    for key in matrix_obj.keys():
        boxplot_obj[key] = []
        for i in range(len(Disease)):
            boxplot_obj[key].append({
                'prob': [],
                'del_prob': []
            })
    for key in boxplot_obj:
        for i in range(len(Disease)):
            
            boxplot_obj[key]