import retain
import process_mimic
import test_retain
import json
import sys
import numpy as np
def data_preprocess(disease):
    process_mimic.pre_mimic(disease)

def retain_train(disease):
    retain.train_RETAIN(
		seqFile='./data/mimic.3digitICD9.seqs',
		inputDimSize=942,
		labelFile='./data/mimic.morts',
		numClass=len(disease),
		outFile='./model/mimic',
		timeFile='./data/mimic.dates',
		modelFile='',
		useLogTime=1,
		embFile='',
		embDimSize=128,
		embFineTune=1
	)

def get_result(patient, path):

    pre, contributions = test_retain.train_RETAIN(
            modelFile=path + 'model/mimic.8.npz',
            patient=patient,
            typeFile=path + 'data/mimic.types',
            useLogTime=True,
            embFile = '',
            logEps=1e-8
    )
    # print 'death'
    # for p in pre:
    #   print p[-1]

    pre = np.transpose(np.array(pre)).tolist()
    pre_result = []
    contributions_result = []

    for i in range(len(pre)):
        prob = max(pre[i])
        index = pre[i].index(prob)
        pre_result.append({
            'prob': prob,
            'time_index': index
        })
        con_max = contributions[index]
        con_result = []
        for visit_con in con_max:
            visit_result = []
            for code_con in visit_con:
                visit_result.append(code_con[i])
            con_result.append(visit_result)
        contributions_result.append(con_result)

    # print np.array(contributions_result).shape
    print json.dumps({"pre":pre_result, "contribution": contributions_result})
    return {'pre':pre_result, 'contribution':contributions}

def json_loads_byteified(json_text):
    return _byteify(
        json.loads(json_text, object_hook=_byteify),
        ignore_dicts=True
    )

def _byteify(data, ignore_dicts = False):
    # if this is a unicode string, return its string representation
    if isinstance(data, unicode):
        return data.encode('utf-8')
    # if this is a list of values, return list of byteified values
    if isinstance(data, list):
        return [ _byteify(item, ignore_dicts=True) for item in data ]
    # if this is a dictionary, return dictionary of byteified keys and values
    # but only if we haven't already byteified it
    if isinstance(data, dict) and not ignore_dicts:
        return {
            _byteify(key, ignore_dicts=True): _byteify(value, ignore_dicts=True)
            for key, value in data.iteritems()
        }
    # if it's anything else, return it in its original form
    return data


if __name__ == '__main__':
    patient = sys.argv[1]
    path = sys.argv[2]
    patient = json_loads_byteified(patient)
    #sys.stdout.flush()
    # Disease = ['401', '402', '403', '404']
    # data_preprocess(Disease)
    # retain_train(Disease)
    get_result(patient,path)


