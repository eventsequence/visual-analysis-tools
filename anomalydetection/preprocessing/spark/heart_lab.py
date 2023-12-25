from datetime import datetime, timedelta, date

import pyspark
import json
from datetime import datetime
import numpy as np
from pyspark.sql import SparkSession, DataFrameWriter, Row, SQLContext
from pyspark.sql.functions import lit, monotonically_increasing_id, collect_list, concat_ws
from pyspark.sql.window import Window
from pyspark.sql.types import *
import pickle

import sys

class Core(object):

    def Time_format(str):
        dt = datetime.strptime(str, '%Y-%m-%d  %H:%M:%S')
        timestamp = (dt - datetime(1970, 1, 1)).total_seconds()
        return timestamp

    def __init__(self, inPath,core = '35'):


        self.spark = SparkSession.builder\
            .master("local[" + core + "]")\
            .appName("Grid Info")\
            .config("spark.executor.memory", "2g")\
            .config("spark.driver.memory", "4g")\
            .config("spark.eventLog.enabled", "false")\
            .getOrCreate()

        self.spark.sparkContext.setLogLevel("ERROR")

        inPath1 = "file:///home/zcjin/database/DIAGNOSES_ICD.csv"
        inPath2 = "file:///home/zcjin/database/D_ICD_DIAGNOSES.csv"

        self.df = self.spark.read\
            .format("com.databricks.spark.csv")\
            .option("header", "true")\
            .option("ignoreLeadingWhiteSpace","true")\
            .option("mode", "DROPMALFORMED")\
            .load(inPath1)

        self.df.printSchema()

        diagno_df = self.df.select("SUBJECT_ID","HADM_ID","SEQ_NUM","ICD9_CODE")
        diagno_df.registerTempTable("dia")
        diagno_df.printSchema()

        self.df = self.spark.read\
            .format("com.databricks.spark.csv")\
            .option("header", "true")\
            .option("ignoreLadingWhiteSpace","true")\
            .option("mode", "DROPMALFORMED")\
            .load(inPath2)
        self.df.printSchema()

        ICD_df = self.df.select("ICD9_CODE","SHORT_TITLE")

        diagno_df = self.spark.sql("select SUBJECT_ID, HADM_ID, SEQ_NUM, floor(cast(ICD9_CODE as int)/10) as ICD9_CODE from dia")
        diagno_df = diagno_df.filter(diagno_df.ICD9_CODE.isNotNull())
        diagno_df.show()
        diagno_df = diagno_df.filter(diagno_df.ICD9_CODE < 430)
        diagno_df = diagno_df.filter(diagno_df.ICD9_CODE >= 390)
        diagno_df.registerTempTable("diagonise")

        patient_list = self.spark.sql("select distinct SUBJECT_ID from diagonise")
        patient_list.registerTempTable("pat")
        print(patient_list.count())

        label_df = self.spark.read\
            .format("com.databricks.spark.csv")\
            .option("header", "true")\
            .option("ignoreLadingWhiteSpace","true")\
            .option("mode", "DROPMALFORMED")\
            .load("file:///home/zcjin/database/item_idlab.csv")

        self.df = self.spark.read \
            .format("com.databricks.spark.csv") \
            .option("header", "true") \
            .option("ignoreLeadingWhiteSpace", "true") \
            .option("mode", "DROPMALFORMED") \
            .load("file:///home/zcjin/database/INPUTEVENTS_MV.csv")

        medical_df = self.df.select("SUBJECT_ID", "HADM_ID", "ITEMID", "STARTTIME")
        medical_df = medical_df.join(label_df, label_df.ITEMID == medical_df.ITEMID, "inner").select(medical_df.SUBJECT_ID,medical_df.HADM_ID,medical_df.ITEMID,medical_df.STARTTIME,label_df.CATEGORY)
        medical_df = medical_df.join(patient_list, patient_list.SUBJECT_ID == medical_df.SUBJECT_ID, "inner").select(medical_df.SUBJECT_ID, medical_df.HADM_ID,medical_df.ITEMID,medical_df.STARTTIME,medical_df.CATEGORY)
        medical_df = medical_df.select("SUBJECT_ID", "HADM_ID", "ITEMID", "STARTTIME", "CATEGORY")
        medical_df.registerTempTable("medical")
        medical_df.show()

        self.df = self.spark.read\
            .format("com.databricks.spark.csv")\
            .option("header", "true")\
            .option("ignoreLeadingWhiteSpace","true")\
            .option("mode", "DROPMALFORMED")\
            .load("file:///home/zcjin/database/CHARTEVENTS.csv")

        chart_df = self.df.select("SUBJECT_ID","HADM_ID","ITEMID","CHARTTIME","WARNING")
        chart_df = chart_df.join(label_df, label_df.ITEMID==chart_df.ITEMID, "inner").select(chart_df.SUBJECT_ID, chart_df.HADM_ID, chart_df.ITEMID, chart_df.CHARTTIME, chart_df.WARNING, label_df.CATEGORY)
        chart_df.printSchema()
        chart_df = chart_df.filter(chart_df.CATEGORY.isNotNull())

        chart_df = chart_df.join(patient_list, patient_list.SUBJECT_ID == chart_df.SUBJECT_ID, "inner").select(chart_df.SUBJECT_ID, chart_df.HADM_ID, chart_df.ITEMID, chart_df.CHARTTIME, chart_df.CATEGORY,chart_df.WARNING)
        chart_df = chart_df.select("SUBJECT_ID","HADM_ID","ITEMID","CHARTTIME","CATEGORY","WARNING")
        chart_df.registerTempTable("chart")

        lab_df = self.spark.sql("select SUBJECT_ID, HADM_ID, ITEMID, CHARTTIME, CATEGORY, WARNING from chart where CATEGORY = 'Labs'")
        lab_df.registerTempTable("lab")
        lab_df = self.spark.sql("select SUBJECT_ID, HADM_ID, ITEMID, CHARTTIME, CATEGORY from lab where WARNING = '1'")
        lab_df.registerTempTable("lab")
        #
        # labNo = self.spark.sql("select concat_ws('-', 'L', CODE, '0') as CODE, CATEGORY from lab_tmp")
        # labNo.registerTempTable("labNo")
        # labYes = self.spark.sql("select concat_ws('-', 'L', CODE, '1') as CODE, CATEGORY from lab_tmp")
        # labYes.registerTempTable("labYes")
        # labYes.show()
        lab_df.show()

        result = self.spark.sql("select SUBJECT_ID, HADM_ID, ITEMID as CODE, STARTTIME as TIME, CATEGORY from medical union all select SUBJECT_ID, HADM_ID, ITEMID as CODE, CHARTTIME as TIME, CATEGORY from lab")
        result.registerTempTable("result")
        # self.diagose.printSchema()
        # self.diagose.show()
        # self.diagose.write.csv("file:///home/zcjin/Diagnose")
        patient_list = self.spark.sql("select distinct SUBJECT_ID from result")

        events = self.spark.sql("select distinct ITEMID as CODE, CATEGORY from medical union select distinct ITEMID as CODE, CATEGORY from lab")
        events.registerTempTable("event")

        # print(events.count())
        events.show(30)
        marks = self.spark.sql("select row_number() over(order by CODE) as MARK, * from event order by CODE")
        marks.show()

        result = result.join(marks, marks.CODE==result.CODE, "left").select(result.SUBJECT_ID, result.TIME, marks.MARK, marks.CODE)
        result.registerTempTable("result")
        result = self.spark.sql("select distinct * from result order by TIME asc")
        result.registerTempTable("result")

        result.show()

        self.patient_string = self.spark.sql(
            "select A.SUBJECT_ID, concat_ws('|',collect_list(A.MARK)) as Event_String from result as A group by A.SUBJECT_ID")
        self.patient_string.show()

        self.patient = self.spark.read \
            .format("com.databricks.spark.csv") \
            .option("header", "true") \
            .option("ignoreLeadingWhiteSpace", "true") \
            .option("mode", "DROPMALFORMED") \
            .load("file:///home/zcjin/database/PATIENTS.csv")

        self.patient = self.patient.select("SUBJECT_ID","GENDER","DOB")

        self.patient = self.patient.join(self.patient_string, self.patient.SUBJECT_ID==self.patient_string.SUBJECT_ID,"right").select(self.patient.SUBJECT_ID,self.patient.GENDER,self.patient.DOB,self.patient_string.Event_String)
        self.patient.show()
        marks.write.csv("file:///home/zcjin/Data_event_anomaly")
        result.write.csv("file:///home/zcjin/Data_connect_anomaly")
        self.patient.write.csv("file:///home/zcjin/Data_patient_anomaly")



if __name__ == "__main__":

    # running on server
    inputpath = "file:///home/zcjin/database/DIAGNOSES_ICD.csv"
    
    core = Core(inputpath, core="4")