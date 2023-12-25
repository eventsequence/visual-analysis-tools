# Generated with SMOP  0.41
from libsmop import *

###########################################################################

# Learning Granger causality for Hawkes processes by MLE based method

###########################################################################
options = {}
options.N = copy(2000)
options.Nmax = copy(500)
options.Tmax = copy(200)
options.tstep = copy(0.1)
options.dt = copy(0.1)
options.M = copy(250)
options.GenerationNum = copy(100)
D=7

para1.kernel = copy('gauss')

para1.w = copy(2)

para1.landmark = copy(arange(0,12,4))

L=length(para1.landmark)
# initialize ground truth parameters
para1.mu = copy(rand(D,1) / D)
para1.A = copy(zeros(D,D,L))
for l in arange(1,L).reshape(-1):
    para1.A[arange(),arange(),l]=dot((0.5 ** l),(0.5 + ones(D)))

mask=multiply(rand(D),double(rand(D) > 0.7))
para1.A = copy(multiply(para1.A,repmat(mask,concat([1,1,L]))))
para1.A = copy(dot(0.25,para1.A) / max(abs(eig(sum(para1.A,3)))))

tmp=para1.A
para1.A = copy(reshape(para1.A,concat([D,L,D])))
for di in arange(1,D).reshape(-1):
    for dj in arange(1,D).reshape(-1):
        phi=tmp(di,dj,arange())
        para1.A[dj,arange(),di]=ravel(phi)

# two simulation methods
Seqs1=Simulation_Branch_HP(para1,options)
# Seqs1 = Simulation_Thinning_HP(para1, options);

alg1 = {}
alg1["LowRank"] = 0
alg1["Sparse"] = 1
alg1["alphaS"] = 1
alg1["GroupSparse"] = 1
alg1["alphaGS"] = 100
alg1["outer"] = 8
alg1["rho"] = 0.1
alg1["inner"] = 5
alg1["thres"] = 1e-05
alg1["Tmax"] = []
alg1["storeErr"] = 0
alg1["storeLL"] = 0

model1=Initialization_Basis(Seqs1)
# learning the model by MLE
model1=Learning_MLE_Basis(Seqs1,model1,alg1)
A1,Phi1=ImpactFunc(model1,options,nargout=2)
    