\c event_causal_db

CREATE TABLE IF NOT EXISTS connect(CODE VARCHAR(32) NOT NULL, HADM_ID int NOT NULL REFERENCES patient(HADM_ID), MARK int NOT NULL REFERENCES eve
nt(MARK),event_time VARCHAR(256) NOT NULL);
\COPY connect(CODE,HADM_ID,MARK,event_time) FROM '/home/zcjin/connect_causality.csv' DELIMITER ',' CSV