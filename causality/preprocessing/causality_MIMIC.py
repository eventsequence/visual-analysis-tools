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


if __name__ == "__main__":
    def Age(r):
        DOB = datetime.strptime(r[3], '%Y-%m-%d  %H:%M:%S').year
        DOAD = datetime.strptime(r[4], '%Y-%m-%d  %H:%M:%S').year
        age = DOAD-DOB
        if age == 300:
            age = 91
        else:
            age = age + 1
        return {'SUBJECT_ID': r[0], 'HADM_ID': r[1], 'GENDER': r[2], 'AGE': age, 'HOSPITAL_EXPIRE_FLAG': r[5]}
        # return {'SUBJECT_ID':r[0], 'HADM_ID':r[1], 'GENDER':r[2], 'Age': age, 'DOB':r[3], 'ADMITTIME':r[4], 'HOSPITAL_EXPIRE_FLAG':r[5]}
    def Date(r):
        date = r[1].split(' ')[0]
        return {'HADM_ID': r[0], 'TIME': date, 'MARK': r[2], 'CODE': r[3]}

    Spark = SparkSession.builder\
        .master("local[35]")\
        .appName("Grid Info")\
        .config("spark.executor.memory", "4g")\
        .config("spark.driver.memory", "8g")\
        .config("spark.eventLog.enabled", "false")\
        .getOrCreate()

    Spark.sparkContext.setLogLevel("ERROR")

    DIAGNOSES_ICD = "file:///home/zcjin/database/DIAGNOSES_ICD.csv"
    D_ICD_DIAGNOSES = "file:///home/zcjin/database/D_ICD_DIAGNOSES.csv"
    ADMISSIONS = "file:///home/zcjin/database/ADMISSIONS.csv"
    INPUTEVENTS_MV = "file:///home/zcjin/database/INPUTEVENTS_MV.csv"
    CHARTEVENTS = "file:///home/zcjin/database/CHARTEVENTS.csv"
    item_idlab = "file:///home/zcjin/database/item_idlab.csv"
    PATIENTS = "file:///home/zcjin/database/PATIENTS.csv"

    # Admission
    admit_df = Spark.read \
        .format("com.databricks.spark.csv") \
        .option("header", "true") \
        .option("ignoreLeadingWhiteSpace", "true") \
        .option("mode", "DROPMALFORMED") \
        .load(ADMISSIONS)
    admit_df = admit_df.select("SUBJECT_ID","HADM_ID","ADMITTIME","HOSPITAL_EXPIRE_FLAG","HAS_CHARTEVENTS_DATA")
    admit_df.printSchema()
    admit_df = admit_df.filter(admit_df.HAS_CHARTEVENTS_DATA=='1')
    admit_df.show()
    df = Spark.read\
        .format("com.databricks.spark.csv")\
        .option("header", "true")\
        .option("ignoreLeadingWhiteSpace","true")\
        .option("mode", "DROPMALFORMED")\
        .load(DIAGNOSES_ICD)
    df.printSchema()
    diagno_df = df.select("SUBJECT_ID","HADM_ID","SEQ_NUM","ICD9_CODE")
    diagno_df.registerTempTable("dia")
    diagno_df.printSchema()
    df = Spark.read\
        .format("com.databricks.spark.csv")\
        .option("header", "true")\
        .option("ignoreLadingWhiteSpace","true")\
        .option("mode", "DROPMALFORMED")\
        .load(D_ICD_DIAGNOSES)
    df.printSchema()
    ICD_df = df.select("ICD9_CODE","SHORT_TITLE")
    diagno_df = Spark.sql("select SUBJECT_ID, HADM_ID, SEQ_NUM, floor(cast(ICD9_CODE as int)/10) as ICD9_CODE from dia")
    diagno_df = diagno_df.filter(diagno_df.ICD9_CODE.isNotNull())
    diagno_df.show()
    diagno_df.registerTempTable("diagonise")
    diagno_df = Spark.sql("select A.* from diagonise as A where SEQ_NUM = (select min(SEQ_NUM) from diagonise where HADM_ID = A.HADM_ID)")
    diagno_df = diagno_df.filter(diagno_df.ICD9_CODE < 430)
    diagno_df = diagno_df.filter(diagno_df.ICD9_CODE >= 390)
    diagno_df.registerTempTable("diagonise")

    # Diagnosis
    diagno_df = diagno_df.join(admit_df, diagno_df.HADM_ID == admit_df.HADM_ID, "inner").select(admit_df.SUBJECT_ID, admit_df.HADM_ID, diagno_df.ICD9_CODE, admit_df.ADMITTIME)
    diagno_df = diagno_df.withColumn("CATEGORY", lit('diagnose'))
    diagno_df.registerTempTable("diagno")
    hadm_list = Spark.sql("select distinct HADM_ID, SUBJECT_ID from diagno")
    hadm_list.registerTempTable("hadm")

    # Admission
    patient_df = Spark.read \
        .format("com.databricks.spark.csv") \
        .option("header", "true") \
        .option("ignoreLeadingWhiteSpace", "true") \
        .option("mode", "DROPMALFORMED") \
        .load(PATIENTS)
    patient_df = patient_df.select("SUBJECT_ID", "GENDER", "DOB")
    admit_df = admit_df.join(hadm_list, hadm_list.HADM_ID == admit_df.HADM_ID, 'inner').select(admit_df.SUBJECT_ID,admit_df.HADM_ID,admit_df.ADMITTIME,admit_df.HOSPITAL_EXPIRE_FLAG)
    admit_df = admit_df.join(patient_df, patient_df.SUBJECT_ID == admit_df.SUBJECT_ID, 'left').select(patient_df.SUBJECT_ID, admit_df.HADM_ID, patient_df.GENDER, patient_df.DOB,admit_df.ADMITTIME,admit_df.HOSPITAL_EXPIRE_FLAG)
    admit_df = admit_df.rdd.map(lambda x: Age(x)).toDF()
    admit_df.show()

    # diagno_df = diagno_df.join(admit_df, diagno_df.HADM_ID == diagno_df.HADM_ID, 'inner').select()


    # Medication
    label_df = Spark.read\
        .format("com.databricks.spark.csv")\
        .option("header", "true")\
        .option("ignoreLadingWhiteSpace","true")\
        .option("mode", "DROPMALFORMED")\
        .load(item_idlab)
    medical_df = Spark.read \
        .format("com.databricks.spark.csv") \
        .option("header", "true") \
        .option("ignoreLeadingWhiteSpace", "true") \
        .option("mode", "DROPMALFORMED") \
        .load(INPUTEVENTS_MV)
    medical_df = medical_df.select("SUBJECT_ID", "HADM_ID", "ITEMID", "STARTTIME")
    medical_df = medical_df.join(label_df, label_df.ITEMID == medical_df.ITEMID, "inner").select(medical_df.SUBJECT_ID,medical_df.HADM_ID,medical_df.ITEMID,medical_df.STARTTIME,label_df.CATEGORY)
    medical_df = medical_df.join(hadm_list, hadm_list.HADM_ID == medical_df.HADM_ID, "inner").select(medical_df.SUBJECT_ID, medical_df.HADM_ID,medical_df.ITEMID,medical_df.STARTTIME,medical_df.CATEGORY)
    medical_df = medical_df.select("SUBJECT_ID", "HADM_ID", "ITEMID", "STARTTIME", "CATEGORY")
    medical_df.registerTempTable("medical")
    medical_df.show()

    # Lab Test
    chart_df = Spark.read\
        .format("com.databricks.spark.csv")\
        .option("header", "true")\
        .option("ignoreLeadingWhiteSpace","true")\
        .option("mode", "DROPMALFORMED")\
        .load(CHARTEVENTS)
    chart_df = chart_df.select("SUBJECT_ID","HADM_ID","ITEMID","CHARTTIME","WARNING")
    chart_df = chart_df.join(label_df, label_df.ITEMID==chart_df.ITEMID, "inner").select(chart_df.SUBJECT_ID, chart_df.HADM_ID, chart_df.ITEMID, chart_df.CHARTTIME, chart_df.WARNING, label_df.CATEGORY)
    chart_df.printSchema()
    chart_df = chart_df.filter(chart_df.CATEGORY.isNotNull())
    chart_df = chart_df.join(hadm_list, hadm_list.HADM_ID == chart_df.HADM_ID, "inner").select(chart_df.SUBJECT_ID, chart_df.HADM_ID, chart_df.ITEMID, chart_df.CHARTTIME, chart_df.CATEGORY,chart_df.WARNING)
    chart_df = chart_df.select("SUBJECT_ID","HADM_ID","ITEMID","CHARTTIME","CATEGORY","WARNING")
    chart_df.registerTempTable("chart")
    lab_df = Spark.sql("select SUBJECT_ID, HADM_ID, ITEMID, CHARTTIME, CATEGORY, WARNING from chart where CATEGORY = 'Labs'")
    lab_df.registerTempTable("lab")
    lab_df = Spark.sql("select SUBJECT_ID, HADM_ID, ITEMID, CHARTTIME, CATEGORY from lab where WARNING = '1'")
    lab_df.registerTempTable("lab")
    # labNo = Spark.sql("select concat_ws('-', 'L', CODE, '0') as CODE, CATEGORY from lab_tmp")
    # labNo.registerTempTable("labNo")
    # labYes = Spark.sql("select concat_ws('-', 'L', CODE, '1') as CODE, CATEGORY from lab_tmp")
    # labYes.registerTempTable("labYes")
    # labYes.show()
    lab_df.show()

    # Event
    events = Spark.sql("select distinct ITEMID as CODE, CATEGORY from medical union select distinct ITEMID as CODE, CATEGORY from lab")
    events.registerTempTable("event")
    events = Spark.sql("select CODE, CATEGORY from event union select distinct ICD9_CODE as CODE, CATEGORY from diagno")
    events.registerTempTable("event")
    marks = Spark.sql("select row_number() over(order by CODE) as MARK, * from event order by CODE")
    marks.show()
    # Connect
    result = Spark.sql(
        "select SUBJECT_ID, HADM_ID, ITEMID as CODE, STARTTIME as TIME, CATEGORY from medical union all select SUBJECT_ID, HADM_ID, ITEMID as CODE, CHARTTIME as TIME, CATEGORY from lab")
    result.registerTempTable("result")
    result = Spark.sql("select SUBJECT_ID, HADM_ID, CODE, TIME, CATEGORY from result union all select SUBJECT_ID, HADM_ID, ICD9_CODE as CODE, ADMITTIME as TIME, CATEGORY from diagno")
    result.registerTempTable("result")
    result = result.join(marks, marks.CODE==result.CODE, "left").select(result.HADM_ID, result.TIME, marks.MARK, marks.CODE)
    result.registerTempTable("result")
    result = Spark.sql("select distinct * from result order by TIME asc")
    result = result.rdd.map(lambda x: Date(x)).toDF()
    result.registerTempTable("result")
    result.show()

    admission_string = Spark.sql("select A.HADM_ID, concat_ws('|',collect_list(A.MARK)) as Event_String from result as A group by A.HADM_ID")
    admission_string.show()
    admit_df = admit_df.join(admission_string, admit_df.HADM_ID == admission_string.HADM_ID, "right").select(admit_df.SUBJECT_ID, admit_df.HADM_ID, admission_string.Event_String, admit_df.GENDER, admit_df.AGE, admit_df.HOSPITAL_EXPIRE_FLAG)

    marks.write.csv("file:///home/zcjin/Data_event_causality")
    result.write.csv("file:///home/zcjin/Data_connect_causality")
    admit_df.write.csv("file:///home/zcjin/Data_patient_causality")
