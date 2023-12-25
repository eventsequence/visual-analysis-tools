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
        diagno_df = diagno_df.filter(diagno_df.ICD9_CODE>=390)
        diagno_df = diagno_df.filter(diagno_df.ICD9_CODE < 430)
        diagno_df.show()
        diagno_df.registerTempTable("diagonise")
        #newdf = diagno_df.join(ICD_df, ICD_df.ICD9_CODE==diagno_df.ICD9_CODE, "left").select(diagno_df.SUBJECT_ID, diagno_df.HADM_ID, diagno_df.ICD9_CODE, ICD_df.SHORT_TITLE)
        diagno_df = self.spark.sql("select A.* from diagonise as A where SEQ_NUM = (select min(SEQ_NUM) from diagonise where HADM_ID = A.HADM_ID)")
        #newdf.printSchema()
        inpath3 = "file:///home/zcjin/preprocess/admission.csv"
        customeSchema1 = StructType([ \
            StructField("SUBJECT_ID", IntegerType(), True), \
            StructField("HADM_ID", IntegerType(), True), \
            StructField("ADMITTIME", StringType(), True)])
        admit_df = self.spark.read\
            .format("com.databricks.spark.csv")\
            .option("header", "false")\
            .option("ignoreLeadingWhiteSpace","true")\
            .option("mode", "DROPMALFORMED")\
            .load(inpath3,schema=customeSchema1)
        #admit_df = admit_df.select("SUBJECT_ID","HADM_ID","ADMITTIME")
		
        admit_df.show()
        admit_df.registerTempTable("admit")
		
        self.diagose = diagno_df.join(admit_df, diagno_df.HADM_ID == admit_df.HADM_ID,"inner").select(admit_df.SUBJECT_ID, admit_df.HADM_ID, diagno_df.ICD9_CODE, admit_df.ADMITTIME)
        self.diagose = self.diagose.withColumn("CATEGORY", lit('diagnose'))
        self.diagose.registerTempTable("diagno")
		
        self.hadm = self.spark.sql("select distinct HADM_ID, ICD9_CODE from diagno")
		
        label_df = self.spark.read\
            .format("com.databricks.spark.csv")\
            .option("header", "true")\
            .option("ignoreLadingWhiteSpace","true")\
            .option("mode", "DROPMALFORMED")\
            .load("file:///home/zcjin/database/item_id2.csv")
			
        self.df = self.spark.read\
            .format("com.databricks.spark.csv")\
            .option("header", "true")\
            .option("ignoreLeadingWhiteSpace","true")\
            .option("mode", "DROPMALFORMED")\
            .load("file:///home/zcjin/database/CHARTEVENTS.csv")
			
        chart_df = self.df.select("SUBJECT_ID","HADM_ID","ITEMID","CHARTTIME")
		
        chart_df = chart_df.join(label_df, label_df.ITEMID==chart_df.ITEMID, "left").select(chart_df.SUBJECT_ID, chart_df.HADM_ID, chart_df.ITEMID, chart_df.CHARTTIME, label_df.CATEGORY)
        chart_df.printSchema()
        chart_df = chart_df.filter(chart_df.CATEGORY.isNotNull())
		
        chart_df = chart_df.join(self.hadm, self.hadm.HADM_ID==chart_df.HADM_ID,"left").select(chart_df.SUBJECT_ID, chart_df.HADM_ID, chart_df.ITEMID, chart_df.CHARTTIME, chart_df.CATEGORY, self.hadm.ICD9_CODE)
        chart_df = chart_df.filter(chart_df.ICD9_CODE.isNotNull())
        chart_df = chart_df.select("SUBJECT_ID","HADM_ID","ITEMID","CHARTTIME","CATEGORY")
        chart_df.registerTempTable("chart")
		
        # test = self.spark.sql("select count(distinct CATEGORY) from chart")
        # test.show()
        # test = self.spark.sql("select distinct CATEGORY from chart")
        # test.show(30)
        # test = self.spark.sql("select * from chart where CATEGORY=Treatments")
        # test.show(30)

        chart_df = self.spark.sql("select SUBJECT_ID, HADM_ID, ITEMID, CHARTTIME, CATEGORY from chart where CATEGORY = 'Treatments'")
        chart_df.registerTempTable("chart")
        chart_df.show()

        result = self.spark.sql("select SUBJECT_ID, HADM_ID, ICD9_CODE as CODE, ADMITTIME as TIME, CATEGORY from diagno union all select SUBJECT_ID, HADM_ID, ITEMID as CODE, CHARTTIME as TIME, CATEGORY from chart")
        result.registerTempTable("result")
        # self.diagose.printSchema()
        # self.diagose.show()
        # self.diagose.write.csv("file:///home/zcjin/Diagnose")
        events = self.spark.sql("select distinct CODE, CATEGORY from result")
        events.registerTempTable("event")

        marks = self.spark.sql("select row_number() over(order by CODE) as MARK, * from event order by CODE")
        marks.show()

        result = result.join(marks, marks.CODE==result.CODE, "left").select(result.SUBJECT_ID, result.TIME, result.CODE, marks.MARK)
        result.registerTempTable("result")
        result = self.spark.sql("select * from result order by TIME asc")
        result.show()

        # self.patient_string = self.spark.sql(
        #     "select A.SUBJECT_ID, concat_ws('|',collect_list(A.MARK)) as Event_String from result as A group by A.SUBJECT_ID")
        # self.patient_string.show()
        #
        # self.patient = self.spark.read \
        #     .format("com.databricks.spark.csv") \
        #     .option("header", "true") \
        #     .option("ignoreLeadingWhiteSpace", "true") \
        #     .option("mode", "DROPMALFORMED") \
        #     .load("file:///home/zcjin/database/PATIENTS.csv")
        #
        # self.patient = self.patient.select("SUBJECT_ID","GENDER","DOB")

        # self.patient = self.patient.join(self.patient_string, self.patient.SUBJECT_ID==self.patient_string.SUBJECT_ID,"right").select(self.patient.SUBJECT_ID,self.patient.GENDER,self.patient.DOB,self.patient_string.Event_String)
        # self.patient.show()
        # marks.write.csv("file:///home/zcjin/Data_event")
        # result.write.csv("file:///home/zcjin/Data_connect")
        # self.patient.write.csv("file:///home/zcjin/Data_patient")

        self.patient_string = self.spark.sql(
            "select A.SUBJECT_ID, concat_ws('|',collect_list(A.MARK)) as Event_String, concat_ws('|',collect_list(A.TIME)) as Time_String, concat_ws('|',collect_list(A.CATEGORY)) as Type_String from result as A group by A.SUBJECT_ID order by A.SUBJECT_ID")

        self.patient_string.show()

        patient_list = self.patient_string.collect()
        patient_list = map(lambda row: [str(c) for c in row], patient_list)
        patient_list_len = len(patient_list)
        print patient_list_len
        train_event = []
        train_time = []
        for i in range(patient_list_len):
            train_event.append(patient_list[i][1].split('|'))
            train_time.append(patient_list[i][2].split('|'))

        print len(train_event)

        ##################################################

        train =[train_event, train_time]

        with open('/home/zcjin/train.json', 'w') as f:
            json.dump(train, f)

        print "Finished!"


if __name__ == "__main__":

    # running on server
    inputpath = "file:///home/zcjin/database/DIAGNOSES_ICD.csv"
    
    core = Core(inputpath, core="4")