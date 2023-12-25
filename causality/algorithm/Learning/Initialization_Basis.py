# Generated with SMOP  0.41
import json
import numpy as np
import math
import copy
import sys
sys.path.append("../BasicFunc/")
from Kernel_Integration import Kernel_Integration
from Kernel import Kernel
from SoftThreshold_LR import SoftThreshold_LR
from SoftThreshold_GS import SoftThreshold_GS
from SoftThreshold_S import SoftThreshold_S

import networkx as nx
import matplotlib.pyplot as plt

def Initialization_Basis(Seqs=None):
    D=np.zeros([len(Seqs),1])
    for i in range(0,len(Seqs)):
        D[i]=max(Seqs[i]["Mark"])

    D=int(max(D))
    sigma = np.zeros([D,D])
    Tmax= np.zeros([D,D])
    est = []
    for i in range(D):
        temp = []
        for j in range(D):
            temp.append([])
        est.append(temp)

    id=np.random.permutation(len(Seqs))
    for n in range(0,min([len(id),10])):
        for i in range(1,len(Seqs[id[n]]["Time"])):
            ti=Seqs[id[n]]["Time"][i]
            di=Seqs[id[n]]["Mark"][i]-1
            for j in range(0,i):
                tj=Seqs[id[n]]["Time"][j]
                dj=Seqs[id[n]]["Mark"][j]-1
                est[di][dj].append(ti - tj)
    for di in range(0,D):
        for dj in range(0,D):
            sigma[di,dj]=((4 * np.std(est[di][dj]) ** 5) / (3*len(est[di][dj]))) ** 0.2
            Tmax[di,dj]=np.mean(est[di][dj])
    Tmax = np.min(Tmax) / 2
    model = {}
    model["kernel"] = 'gauss'
    model["w"] = np.min(sigma) / 2
    model["landmark"] = np.dot(model["w"],(np.arange(0,np.ceil(Tmax / model["w"]))))
    # A = U * M * U U=number of events, M=number of basic functions
    model["A"] = np.random.rand(D,len(model["landmark"]),D) / ((D ** 2) * len(model["landmark"]))
    model["mu"] = np.random.rand(D,1) / D
    return model

def Learning_MLE_Basis(Seqs=None, model=None, alg=None):
    # initial
    Aest = model["A"]
    muest = model["mu"]
    # GK = struct('intG', []);
    print(np.shape(Aest))
    if alg["LowRank"]:
        UL = np.zeros(np.shape(Aest))
        ZL = copy.deepcopy(Aest)
    if alg["Sparse"]:
        US = np.zeros(np.shape(Aest))
        ZS = copy.deepcopy(Aest)
    if alg["GroupSparse"]:
        UG = np.zeros(np.shape(Aest))
        ZG = copy.deepcopy(Aest)

    D = np.shape(Aest)[0]
    if alg["storeLL"]:
        model["LL"] = np.zeros([alg["outer"], 1])
    if alg["storeErr"]:
        model["err"] = np.zeros([alg["outer"], 3])

    for o in range(0, alg["outer"]):
        rho = np.dot(alg["rho"], (1.1 ** (o+1)))
        for n in range(0, alg["inner"]):
            NLL = 0
            Amu = np.zeros([D, 1])
            Bmu = copy.deepcopy(Amu)
            CmatA = np.zeros(np.shape(Aest))
            AmatA = copy.deepcopy(CmatA)
            BmatA = copy.deepcopy(CmatA)
            if alg["LowRank"]:
                BmatA = BmatA + np.dot(rho, (UL - ZL))
                AmatA = AmatA + rho
            if alg["Sparse"]:
                BmatA = BmatA + np.dot(rho, (US - ZS))
                AmatA = AmatA + rho
            if alg["GroupSparse"]:
                BmatA = BmatA + np.dot(rho, (UG - ZG))
                AmatA = AmatA + rho
            # E-step: evaluate the responsibility using the current parameters
            # for c in range(0, len(Seqs)):
            for c in range(0, 20):
                if len(Seqs[c]["Time"])>0:
                    Time = Seqs[c]["Time"]
                    Event = Seqs[c]["Mark"]
                    Tstart = Seqs[c]["Start"]
                    if len(alg["Tmax"])==0:
                        Tstop = Seqs[c]["Stop"]
                    else:
                        Tstop = alg["Tmax"]
                        indt = Time < alg["Tmax"]
                        Time = Time[indt]
                        Event = Event[indt]
                    Amu = Amu + Tstop - Tstart
                    dT = [ Tstop - tt for tt in Time]
                    GK = Kernel_Integration(dT, model)
                    #                 if o==1
                    #                     GK(c).intG = Kernel_Integration(dT, model);
                    #                 end
                    Nc = len(Time)
                    for i in range(0, Nc):
                        ui = Event[i]-1
                        BmatA[ui, :, :] = BmatA[ui, :, :] + (Aest[ui, :, :]> 0).astype(int) * np.tile(GK[i:i+1, :].T, (1, D))
                        ti = Time[i]
                        lambdai = muest[ui]
                        pii = muest[ui]
                        pij = []
                        if i > 0:
                            tj = Time[:i]
                            uj = [ee - 1 for ee in Event[:i]]
                            dt = [ti - tt for tt in tj]
                            gij = Kernel(dt, model)
                            auiuj = Aest[uj, :, ui]
                            pij = auiuj * gij
                            lambdai = lambdai + np.sum(pij)
                        NLL = NLL - np.log(lambdai)
                        pii = pii / lambdai
                        if i > 0:
                            pij = pij / lambdai
                            if len(pij)>0 and np.sum(pij) > 0:
                                for j in range(0, len(uj)):
                                    uuj = uj[j]
                                    CmatA[uuj, :, ui] = CmatA[uuj, :, ui] - pij[j, :]
                        Bmu[ui:ui+1] = Bmu[ui:ui+1] + pii
                    NLL = NLL + (Tstop - Tstart)*np.sum(muest)
                    NLL = NLL + np.sum(np.sum(GK*np.sum(Aest[[ee-1 for ee in Event], :, :], 2),1))
                else:
                    warning('Sequence %d is empty!', c)
            # M-step: update parameters

            # update mu
            mu = Bmu / Amu
            # update a_uu'
            if alg["Sparse"] == 0 and alg["GroupSparse"] == 0 and alg["LowRank"] == 0:
                A = - CmatA / BmatA
                A[np.isnan(A)] = 0
                A[np.isinf(A)] = 0
            else:
                A = (- BmatA + np.sqrt(BmatA ** 2 - np.dot(4, AmatA) * CmatA)) / (np.dot(2, AmatA))
                A[np.isnan(A)] = 0
                A[np.isinf(A)] = 0
            # check convergence
            Err = np.sum(np.abs(A - Aest)) / np.sum(np.abs(Aest))
            Aest = copy.deepcopy(A)
            muest = copy.deepcopy(mu)
            model["A"] = Aest
            model["mu"] = muest
            print('Outer=%d, Inner=%d, Obj=%f, RelErr=%f\n', o, n, NLL, Err)
            if Err < alg["thres"] or (o == alg["outer"] and n == alg["inner"]):
                break
        # # store loglikelihood
        # if alg["storeLL"]:
        #     Loglike = Loglike_Basis(Seqs, model, alg)
        #     model.LL[o] = Loglike
        # # calculate error
        # if alg["storeErr"]:
        #     Err = np.zeros([1, 3])
        #     Err[1] = norm(ravel(model.mu) - ravel(alg.truth.mu)) / norm(ravel(alg.truth.mu))
        #     Err[2] = norm(ravel(model.A) - ravel(alg.truth.A)) / norm(ravel(alg.truth.A))
        #     Err[3] = norm(concat([[ravel(model.mu)], [ravel(model.A)]]) - concat(
        #         [[ravel(alg.truth.mu)], [ravel(alg.truth.A)]])) / norm(
        #         concat([[ravel(alg.truth.mu)], [ravel(alg.truth.A)]]))
        #     model.err[o, :] = Err
        if alg["LowRank"]:
            threshold = alg["alphaLR"] / rho
            ZL = SoftThreshold_LR(Aest + UL, threshold)
            UL = UL + (Aest - ZL)
        if alg["Sparse"]:
            threshold = alg["alphaS"] / rho
            ZS = SoftThreshold_S(Aest + US, threshold)
            US = US + (Aest - ZS)
        if alg["GroupSparse"]:
            threshold = alg["alphaGS"] / rho
            ZG = SoftThreshold_GS(Aest + UG, threshold)
            UG = UG + (Aest - ZG)
    return model

if __name__ == '__main__':
    Seq = json.load(open('../data2.json','r'))
    model = Initialization_Basis(Seq)
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
    model1 = Learning_MLE_Basis(Seq, model, alg1)
    AA = copy.deepcopy(model1["A"])
    AA = np.sum(AA,1)
    G = nx.DiGraph()
    for i in range(np.shape(AA)[0]):
        for j in range(np.shape(AA)[1]):
            if AA[i,j]>0.1:
                G.add_edge(str(i),str(j),weight=1)
    pos = nx.spring_layout(G)
    nx.draw_networkx(G,pos)
    plt.show()

    print(AA)