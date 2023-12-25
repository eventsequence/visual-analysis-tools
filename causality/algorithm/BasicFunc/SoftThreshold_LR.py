import numpy as np

def SoftThreshold_LR(A=None,thres=None):
    Z = np.zeros(np.shape(A))
    for t in range(0,np.shape(A)[1]):
        tmp=A[:,t,:]
        tmp=np.tile(tmp,(np.shape(A)[0],np.shape(A)[2]))
        Ut,St,Vt,_=numpy.linalg.svd(tmp,full_matrices=False)
        St = St - thres
        St[St < 0]=0
        Z[:,t,:]=np.tile(np.dot(Ut*St,Vt),(np.shape(A)[0],np.shape(A)[2]))
    return Z