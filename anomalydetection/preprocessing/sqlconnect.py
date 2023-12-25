#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sun Jan 20 13:36:17 2019

@author: guoshunan
"""

import psycopg2

conn = psycopg2.connect(database='event_anomaly_db',user='username',password='TJ.idvxlab',host='202.120.188.26',port='22')
cur = conn.cursor()
cur.execute("SELECT * FROM table1 LIMIT 10")
rows = cur.fetchall()
print(rows)
conn.commit()
cur.close()
conn.close()