from flask import request
import psycopg2
import json

def regex(patterns):
    patternList = patterns.split('|')
    patternStr = '\\|(.*\\|)?'.join(patternList)
    return '\\|(.*\\|)?' + patternStr + '\\|(.*\\|)?'

def query(p_list):
    database_name = 'event_anomaly_db'
    conn = psycopg2.connect(database=database_name, user="postgres", password="TJ.idvxlab", host="202.120.188.26", port="5432")
    cur = conn.cursor()
    pids = ",".join(p_list)
    sql = 'select pid, event_code, icd_code, event_time from connect where pid in ('+pids+')'
    cur.execute(sql)
    results = cur.fetchall()
    print(results)
    return results

def select_pid(patterns):
    database_name = 'event_anomaly_db'
    conn = psycopg2.connect(database=database_name, user="postgres", password="TJ.idvxlab", host="202.120.188.26", port="5432")
    cur = conn.cursor()
    pattern_str = regex(patterns)
    sql = 'select pid from patient'
    if pattern_str != '':
        sql += ' where '
        sql += "code_string ~ '" + pattern_str + "'"
    sql = 'select pid, event_code, icd_code, event_time from connect where pid in (' + sql + ')'

    cur.execute(sql)
    results = cur.fetchall()
    print(results)
    return results


if __name__ == '__main__':
    # query(["61179", "52467", "9253", "94152", "27616", "29105", "82055", "84909", "77282", "73077", "59628", "40883", "57886"])
    select_pid('3|4')