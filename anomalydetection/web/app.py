from flask import Flask, render_template, request, jsonify
import json
import csv
import numpy as np


App = Flask(__name__)


@App.route("/")
def root():
    return render_template("index.html")

def get_params(request):
    if request.method == 'POST':
        return request.get_json()
    else:
        return request.args

@App.route("/load/<fname>")
def loadData(fname):
	with open("data/mimic/"+fname, "r", encoding="utf-8") as f:
		data = json.load(f)
	return jsonify({"data": data})

@App.route("/p_data/<pid>")
def loadPatientData(pid):
    with open("data/mimic/data/"+pid+".json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify({"data": data})

if __name__ == "__main__":
    App.debug = True
    App.run()
