# Generated with SMOP  0.41
import numpy as np
import math
from scipy.special import erf

def Kernel_Integration(dt=None,para=None):

    distance=np.tile(np.array([dt]).T,(1,len(np.ravel(para["landmark"])))) - np.tile(np.ravel(para["landmark"]).T,(len(dt),1))
    landmark=np.tile(np.ravel(para["landmark"]).T,(len(dt),1))
    if 'exp' == para["kernel"]:
        G=1 - exp(np.dot(- para["w"],(distance - landmark)))
        G[G < 0]=0
        return G
    else:
        if 'gauss' == para["kernel"]:
            G=np.dot(0.5,(erf(distance / (np.dot(math.sqrt(2),para["w"]))) + erf(landmark / (np.dot(math.sqrt(2),para["w"])))))
            return G
        else:
            print('Error: please assign a kernel function!')

    
    