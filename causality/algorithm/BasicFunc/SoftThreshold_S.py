import copy
import numpy as np

def SoftThreshold_S(A=None,thres=None):
    tmp = copy.deepcopy(A)
    S = np.sign(A)
    tmp = np.abs(tmp)-thres
    tmp[tmp<0]=0
    Z = S * tmp
    return Z