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

        diagno_df = self.spark.sql("select SUBJECT_ID, HADM_ID, SEQ_NUM, floor(cast(ICD9_CODE as int)/100) as ICD9_CODE from dia")
        diagno_df = diagno_df.filter(diagno_df.ICD9_CODE.isNotNull())
        diagno_df.show()
        diagno_df.printSchema()

        diagno_df = diagno_df.filter(diagno_df.ICD9_CODE <= 629)
        diagno_df = diagno_df.filter(diagno_df.ICD9_CODE >= 390)
        diagno_df.registerTempTable("diagonise")
        diagno_df = self.spark.sql("select SUBJECT_ID, HADM_ID, SEQ_NUM, cast(ICD9_CODE as string) as ICD9_CODE from diagonise")
        diagno_df.registerTempTable("diagonise")
        diagno_df.show()
        # diagno_df_filter = diagno_df.filter(diagno_df.ICD9_CODE >= 401)
        # diagno_df_filter = diagno_df_filter.filter(diagno_df_filter.ICD9_CODE <= 414)
        # diagno_df_filter.show()
        # diagno_df_filter.registerTempTable("diagonise")

        diagno_df = self.spark.sql("select * from diagonise where diagonise.SUBJECT_ID in (select A.SUBJECT_ID from (select count(distinct HADM_ID) as AD_NUM ,SUBJECT_ID from diagonise group by SUBJECT_ID) as A where A.AD_NUM >1)")
        diagno_df.registerTempTable("diagonise")

        patient_list = self.spark.sql("select distinct SUBJECT_ID from diagonise")
        patient_list.registerTempTable("pat")

        print patient_list.count()

        # dia_df = self.spark.sql("select * from diagonise where SUBJECT_ID in (select pat.SUBJECT_ID from pat)")
        # dia_df.registerTempTable("diagonise")
        # patient_list = self.spark.sql("select distinct SUBJECT_ID from diagonise")
        # print patient_list.count()
        #newdf = diagno_df.join(ICD_df, ICD_df.ICD9_CODE==diagno_df.ICD9_CODE, "left").select(diagno_df.SUBJECT_ID, diagno_df.HADM_ID, diagno_df.ICD9_CODE, ICD_df.SHORT_TITLE)
        # diagno_df = self.spark.sql("select A.* from diagonise as A where SEQ_NUM = (select max(SEQ_NUM) from diagonise where HADM_ID = A.HADM_ID)")

        # diagno_df = self.spark.sql("select A.* from diagonise as A")

        #newdf.printSchema()
        inpath3 = "file:///home/zcjin/preprocess/admission_death_1.csv"
        customeSchema1 = StructType([ \
            StructField("SUBJECT_ID", IntegerType(), True), \
            StructField("HADM_ID", IntegerType(), True), \
            StructField("ADMITTIME", StringType(), True), \
            StructField("DEATHTIME", StringType(), True),])
        admit_df = self.spark.read\
            .format("com.databricks.spark.csv")\
            .option("header", "false")\
            .option("ignoreLeadingWhiteSpace","true")\
            .option("mode", "DROPMALFORMED")\
            .load(inpath3,schema=customeSchema1)
        #admit_df = admit_df.select("SUBJECT_ID","HADM_ID","ADMITTIME")
		
        admit_df.show()
        admit_df.registerTempTable("admit")

        death_df = admit_df.filter(admit_df.DEATHTIME.isNotNull())

        death_df.registerTempTable("death")

        self.death = self.spark.sql("select SUBJECT_ID, DEATHTIME from death")

        self.death.registerTempTable("mort")

        self.death = self.spark.sql("select SUBJECT_ID, max(DEATHTIME) as DEATHTIME from mort group by SUBJECT_ID")

        self.death.show()

        self.diagose = diagno_df.join(admit_df, diagno_df.HADM_ID == admit_df.HADM_ID,"left").select(admit_df.SUBJECT_ID, admit_df.HADM_ID, diagno_df.ICD9_CODE, admit_df.ADMITTIME)
        self.diagose = self.diagose.withColumn("CATEGORY", lit('diagnose'))
        # self.diagose = self.diagose.withColumn("VALUE", lit('0'))
        # self.diagose = self.diagose.withColumn("VALUEUOM", lit('text'))

        self.diagose.registerTempTable("diagno")

        self.diagose.printSchema()

        diagno_df_max = self.spark.sql("select A.HADM_ID from diagno as A where A.ADMITTIME = (select max(ADMITTIME) from diagno where SUBJECT_ID = A.SUBJECT_ID) ")
        diagno_df_max.registerTempTable("diagno_max")

        self.hadm = self.spark.sql("select distinct HADM_ID, ICD9_CODE from diagno where diagno.HADM_ID not in (select HADM_ID from diagno_max)")
        # self.hadm.registerTempTable("hadm")
        # self.hadm = self.spark.sql("select distinct HADM_ID, ICD9_CODE from hadm")
        pro_df = self.spark.read\
            .format("com.databricks.spark.csv")\
            .option("header", "true")\
            .option("ignoreLadingWhiteSpace","true")\
            .option("mode", "DROPMALFORMED")\
            .load("file:///home/zcjin/database/item_id.csv")

        me_df = self.spark.read \
            .format("com.databricks.spark.csv") \
            .option("header", "true") \
            .option("ignoreLadingWhiteSpace", "true") \
            .option("mode", "DROPMALFORMED") \
            .load("file:///home/zcjin/database/item_id3.csv")

        self.df = self.spark.read \
            .format("com.databricks.spark.csv") \
            .option("header", "true") \
            .option("ignoreLeadingWhiteSpace", "true") \
            .option("mode", "DROPMALFORMED") \
            .load("file:///home/zcjin/database/INPUTEVENTS_MV.csv")

        medical_df = self.df.select("SUBJECT_ID", "HADM_ID", "ITEMID", "STARTTIME")
        medical_df = medical_df.join(me_df, me_df.ITEMID == medical_df.ITEMID, "left").select(medical_df.SUBJECT_ID,medical_df.HADM_ID,medical_df.ITEMID,medical_df.STARTTIME,me_df.CATEGORY)
        medical_df = medical_df.filter(medical_df.CATEGORY.isNotNull())
        medical_df = medical_df.join(self.hadm, self.hadm.HADM_ID == medical_df.HADM_ID, "left").select(medical_df.SUBJECT_ID, medical_df.HADM_ID,medical_df.ITEMID,medical_df.STARTTIME,medical_df.CATEGORY,self.hadm.ICD9_CODE)
        medical_df = medical_df.filter(medical_df.ICD9_CODE.isNotNull())
        medical_df = medical_df.select("SUBJECT_ID", "HADM_ID", "ITEMID", "STARTTIME", "CATEGORY")
        # medical_df = medical_df.withColumn("VALUE", lit('0'))
        # medical_df = medical_df.withColumn("VALUEUOM", lit('text'))
        medical_df.registerTempTable("medical")
        medical_df.show()
        print medical_df.count()

        self.df = self.spark.read\
            .format("com.databricks.spark.csv")\
            .option("header", "true")\
            .option("ignoreLeadingWhiteSpace","true")\
            .option("mode", "DROPMALFORMED")\
            .load("file:///home/zcjin/database/PROCEDUREEVENTS_MV.csv")

        procedure_df = self.df.select("SUBJECT_ID","HADM_ID","ITEMID","STARTTIME")
        procedure_df = procedure_df.join(pro_df, pro_df.ITEMID == procedure_df.ITEMID, "left").select(procedure_df.SUBJECT_ID,procedure_df.HADM_ID,procedure_df.ITEMID,procedure_df.STARTTIME,pro_df.CATEGORY)
        procedure_df.printSchema()
        procedure_df = procedure_df.filter(procedure_df.CATEGORY.isNotNull())

        procedure_df = procedure_df.join(self.hadm, self.hadm.HADM_ID == procedure_df.HADM_ID, "left").select(procedure_df.SUBJECT_ID,procedure_df.HADM_ID,procedure_df.ITEMID,procedure_df.STARTTIME,procedure_df.CATEGORY,self.hadm.ICD9_CODE)
        procedure_df = procedure_df.filter(procedure_df.ICD9_CODE.isNotNull())
        procedure_df = procedure_df.select("SUBJECT_ID", "HADM_ID", "ITEMID", "STARTTIME", "CATEGORY")
        procedure_df.registerTempTable("pro")


        # self.df = self.spark.read\
        #     .format("com.databricks.spark.csv")\
        #     .option("header", "true")\
        #     .option("ignoreLeadingWhiteSpace","true")\
        #     .option("mode", "DROPMALFORMED")\
        #     .load("file:///home/zcjin/database/CHARTEVENTS.csv")
        #
        # chart_df = self.df.select("SUBJECT_ID","HADM_ID","ITEMID","CHARTTIME")
        #
        # chart_df = chart_df.join(label_df, label_df.ITEMID==chart_df.ITEMID, "left").select(chart_df.SUBJECT_ID, chart_df.HADM_ID, chart_df.ITEMID, chart_df.CHARTTIME, label_df.CATEGORY)
        # chart_df.printSchema()
        # chart_df = chart_df.filter(chart_df.CATEGORY.isNotNull())
        #
        # chart_df = chart_df.join(self.hadm, self.hadm.HADM_ID==chart_df.HADM_ID,"left").select(chart_df.SUBJECT_ID, chart_df.HADM_ID, chart_df.ITEMID, chart_df.CHARTTIME, chart_df.CATEGORY, self.hadm.ICD9_CODE)
        # chart_df = chart_df.filter(chart_df.ICD9_CODE.isNotNull())
        # chart_df = chart_df.select("SUBJECT_ID","HADM_ID","ITEMID","CHARTTIME","CATEGORY")
        # chart_df.registerTempTable("chart")


        #
        # # test = self.spark.sql("select count(distinct CATEGORY) from chart")
        # # test.show()
        # # test = self.spark.sql("select distinct CATEGORY from chart")
        # # test.show(30)
        # # test = self.spark.sql("select * from chart where CATEGORY=Treatments")
        # # test.show(30)
        #
        # treat_df = self.spark.sql("select SUBJECT_ID, HADM_ID, ITEMID, CHARTTIME, CATEGORY from chart where CATEGORY = 'Treatments'")
        # # treat_df = treat_df.withColumn("VALUE", lit('0'))
        # # treat_df = treat_df.withColumn("VALUEUOM", lit('text'))
        # treat_df.registerTempTable("treat")
        #
        # treat_df.show()

        # lab_df = self.spark.sql("select SUBJECT_ID, HADM_ID, ITEMID, CHARTTIME, CATEGORY, VALUE, VALUEUOM, WARNING from chart where CATEGORY = 'Labs'")
        # lab_df.registerTempTable("lab")
        # lab_tmp = self.spark.sql("select distinct ITEMID as CODE, CATEGORY from lab")
        # lab_tmp.registerTempTable("lab_tmp")
        #
        # labNo = self.spark.sql("select concat_ws('-', 'L', CODE, '0') as CODE, CATEGORY from lab_tmp")
        # labNo.registerTempTable("labNo")
        # labYes = self.spark.sql("select concat_ws('-', 'L', CODE, '1') as CODE, CATEGORY from lab_tmp")
        # labYes.registerTempTable("labYes")
        # labYes.show()

        # lab_df = self.spark.sql("select SUBJECT_ID, HADM_ID, concat_ws('-','L', ITEMID, WARNING) as ITEMID, CHARTTIME, CATEGORY, VALUE, VALUEUOM from lab")
        # lab_df.registerTempTable("lab")
        # lab_df.show()


        # result = self.spark.sql("select SUBJECT_ID, HADM_ID, ICD9_CODE as CODE, ADMITTIME as TIME, CATEGORY from diagno")
        result = self.spark.sql("select SUBJECT_ID, HADM_ID, ICD9_CODE as CODE, ADMITTIME as TIME, CATEGORY from diagno union all select SUBJECT_ID, HADM_ID, ITEMID as CODE, STARTTIME as TIME, CATEGORY from pro union all select SUBJECT_ID, HADM_ID, ITEMID as CODE, STARTTIME as TIME, CATEGORY from medical")
        result.registerTempTable("result")
        # self.diagose.printSchema()
        # self.diagose.show()
        # self.diagose.write.csv("file:///home/zcjin/Diagnose")
        patient_list = self.spark.sql("select distinct SUBJECT_ID from result")
        print patient_list.count()

        events = self.spark.sql("select distinct ICD9_CODE as CODE, CATEGORY from diagno union select distinct ITEMID as CODE, CATEGORY from pro union select distinct ITEMID as CODE, CATEGORY from medical")
        events.registerTempTable("event")

        print events.count()
        events.show(30)

        marks = self.spark.sql("select row_number() over(order by CODE) as MARK, * from event order by CODE")
        marks.show()

        result = result.join(marks, marks.CODE==result.CODE, "left").select(result.SUBJECT_ID, result.TIME, marks.MARK, marks.CODE)
        result.registerTempTable("result")
        result = self.spark.sql("select distinct * from result order by TIME asc")
        result.registerTempTable("result")

        # result = self.spark.sql("select  * from result")

        result.show()

        # self.patient_string = self.spark.sql(
        #     "select A.SUBJECT_ID, concat_ws('|',collect_list(A.MARK)) as Event_String from result as A group by A.SUBJECT_ID")
        # self.patient_string.show()

        # self.patient = self.spark.read \
        #     .format("com.databricks.spark.csv") \
        #     .option("header", "true") \
        #     .option("ignoreLeadingWhiteSpace", "true") \
        #     .option("mode", "DROPMALFORMED") \
        #     .load("file:///home/zcjin/database/PATIENTS.csv")

        # self.patient = self.patient.select("SUBJECT_ID","GENDER","DOB")

        # self.patient = self.patient.join(self.patient_string, self.patient.SUBJECT_ID==self.patient_string.SUBJECT_ID,"right").select(self.patient.SUBJECT_ID,self.patient.GENDER,self.patient.DOB,self.patient_string.Event_String)
        # self.patient.show()

        # self.patient = self.patient.join(self.death, self.patient.SUBJECT_ID==self.death.SUBJECT_ID,"left").select(self.patient.SUBJECT_ID,self.patient.GENDER,self.patient.DOB,self.patient.Event_String, self.death.DEATHTIME)

        # self.patient.show()
        # marks.write.csv("file:///home/zcjin/Data_event_25")
        # result.write.csv("file:///home/zcjin/Data_connect_25")
        # self.patient.write.csv("file:///home/zcjin/Data_patient_25")

        print "database"
        self.patient_string_2 = self.spark.sql(
           "select A.SUBJECT_ID, concat_ws('|',collect_list(A.MARK)) as Event_String, concat_ws('|',collect_list(A.TIME)) as Time_String, concat_ws('|',collect_list(A.CODE)) as Code_String from result as A group by A.SUBJECT_ID")

        self.patient_string_2.show()

        self.patient_string_2 = self.patient_string_2.join(self.death, self.patient_string_2.SUBJECT_ID==self.death.SUBJECT_ID,"left").select(self.patient_string_2.SUBJECT_ID, self.patient_string_2.Event_String, self.patient_string_2.Time_String, self.patient_string_2.Code_String, self.death.DEATHTIME)


        patient_list = self.patient_string_2.collect()
        patient_list = map(lambda row: [str(c) for c in row], patient_list)
        patient_list_len = len(patient_list)
        print patient_list_len
        train_event = []
        train_time = []
        train_code = []
        train_mort = []
        train_pid = []
        for i in range(patient_list_len):
            train_event.append(patient_list[i][1].split('|'))
            train_time.append(patient_list[i][2].split('|'))
            train_code.append(patient_list[i][3].split('|'))
            train_pid.append(patient_list[i][0])
            if patient_list[i][4] == '1900-01-00 00:00:00':
                print 'yes'
                train_mort.append(0)
            else:
                print 'yes'
                train_mort.append(1)
        #################################################

        train =[train_event, train_time, train_code, train_mort, train_pid]

        with open('/home/zcjin/train_12.json', 'w') as f:
           json.dump(train, f)

        print "Finished!"


if __name__ == "__main__":

    # running on server
    inputpath = "file:///home/zcjin/database/DIAGNOSES_ICD.csv"
    
    core = Core(inputpath, core="4")