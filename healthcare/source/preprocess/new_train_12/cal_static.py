import json
import numpy as np

if __name__ == '__main__':
    Disease = ["584", "560", "401", "418", "599", "384", "459", "585", "411", "579", "537", "427", "428", "424", "365", "410", "455", "507", "571", "553", "518", "443", "440", "593", "578", "396", "458", "557", "425", "416", "494", "552", "576", "492", "484", "573", "457", "572", "512", "511", "447", "414", "426", "437", "397", "517", "487", "577", "441", "442", "381", "567", "421", "456", "423", "482", "519", "536", "530", "395", "453", "527", "568", "581", "528", "583", "510", "556", "594", "592", "543", "540", "446", "555", "558", "366", "478", "432", "413", "564", "389", "465", "588", "438", "394", "435", "483", "575", "596", "369", "565", "529", "461", "569", "454", "391", "466", "513", "495", "480", "380", "531", "429", "516", "368", "547", "595", "582", "525", "444", "491", "408", "522", "473", "506", "589", "598", "597", "523", "361", "532", "541", "383", "420", "477", "415", "580", "422", "551", "382", "451", "526", "590", "417", "373", "508", "472", "544", "488", "471", "388", "364", "379", "520", "370", "448", "474", "378"]

    with open('./matrix_obj.json', 'r') as f:
        matrix_obj = json.load(f)
    print matrix_obj.keys()
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
            item = matrix_obj[key][i]
            min_ = min(item['prob'])
            percentile_ = np.percentile(item['prob'], [25, 50, 75])
            max_ = max(item['prob'])
            boxplot_obj[key][i]['prob'].append(min_)
            for perc in percentile_:
                boxplot_obj[key][i]['prob'].append(perc)
            boxplot_obj[key][i]['prob'].append(max_)
            min_ = min(item['del_prob'])
            percentile_ = np.percentile(item['del_prob'], [25, 50, 75])
            max_ = max(item['del_prob'])
            boxplot_obj[key][i]['del_prob'].append(min_)
            for perc in percentile_:
                boxplot_obj[key][i]['del_prob'].append(perc)
            boxplot_obj[key][i]['del_prob'].append(max_)
            print boxplot_obj[key][i]['del_prob']

    with open('./boxplot.json', 'w') as f:
        json.dump(boxplot_obj, f)
    
    with open('./boxplot.json', 'r') as f:
        a = json.load(f)
    
    print a.keys()
    # print a[a.keys()[0]]
    print len(a[a.keys()[0]])

