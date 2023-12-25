import numpy as np

def SoftThreshold_GS(A=None,thres=None):
    Z = np.zeros(np.shape(A))
    for u in range(0,np.shape(A)[2]):
        for v in range(0,np.shape(A)[0]):
            #tmp = 1
            tmp=1 - thres / np.linalg.norm(A[v,:,u])
            if tmp > 0:
                Z[v,:,u] = np.dot(tmp,A[v,:,u])

    return Z
    