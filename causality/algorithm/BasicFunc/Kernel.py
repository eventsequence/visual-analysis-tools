# Generated with SMOP  0.41
import numpy as np
import math

def Kernel(dt=None,para=None):

    distance= np.tile(np.array([dt]).T,(1,len(np.ravel(para["landmark"])))) - np.tile(np.ravel(para["landmark"]).T,(len(dt),1))
    if 'exp' == para["kernel"]:
        g = np.dot(para["w"],exp(np.dot(- para["w"],distance)))
        g[g > 1]=0
        return g
    else:
        if 'gauss' == para["kernel"]:
            g = np.exp(- (distance ** 2) / (np.dot(2,para["w"] ** 2))) / (np.dot(math.sqrt(2*math.pi),para["w"]))
            return g
        else:
            print('Error: please assign a kernel function!')
    
    