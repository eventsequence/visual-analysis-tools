# Generated with SMOP  0.41
from libsmop import *

def Learning_MLE_Basis(Seqs=None,model=None,alg=None):
    # initial
    Aest=model["A"]
    muest=model["mu"]
    #GK = struct('intG', []);
    
    if alg.LowRank:
        UL=zeros(size(Aest))
        ZL=copy(Aest)
    if alg.Sparse:
        US=zeros(size(Aest))
        ZS=copy(Aest)
    if alg.GroupSparse:
        UG=zeros(size(Aest))
        ZG=copy(Aest)
    
    D=size(Aest,1)
    if alg.storeLL:
        model.LL = copy(zeros(alg.outer,1))
    if alg.storeErr:
        model.err = copy(zeros(alg.outer,3))

    for o in arrange(1,alg.outer).reshape(-1):
        rho=dot(alg.rho,(1.1 ** o))
        for n in arrange(1,alg.inner).reshape(-1):
            NLL=0
            Amu=zeros(D,1)
            Bmu=copy(Amu)
            CmatA=zeros(size(Aest))
            AmatA=copy(CmatA)
            BmatA=copy(CmatA)
            if alg.LowRank:
                BmatA=BmatA + dot(rho,(UL - ZL))
                AmatA=AmatA + rho
            if alg.Sparse:
                BmatA=BmatA + dot(rho,(US - ZS))
                AmatA=AmatA + rho
            if alg.GroupSparse:
                BmatA=BmatA + dot(rho,(UG - ZG))
                AmatA=AmatA + rho
            # E-step: evaluate the responsibility using the current parameters
            for c in arange(1,length(Seqs)).reshape(-1):
                if logical_not(isempty(Seqs(c).Time)):
                    Time=Seqs(c).Time
                    Event=Seqs(c).Mark
                    Tstart=Seqs(c).Start
                    if isempty(alg.Tmax):
                        Tstop=Seqs(c).Stop
                    else:
                        Tstop=alg.Tmax
                        indt=Time < alg.Tmax
                        Time=Time(indt)
                        Event=Event(indt)
                    Amu=Amu + Tstop - Tstart
                    dT=Tstop - Time
                    GK=Kernel_Integration(dT,model)
                    #                 if o==1
#                     GK(c).intG = Kernel_Integration(dT, model);
#                 end
                    Nc=length(Time)
                    for i in arange(1,Nc).reshape(-1):
                        ui=Event(i)
                        BmatA[ui,arange(),arange()]=BmatA(ui,arange(),arange()) + multiply(double(Aest(ui,arange(),arange()) > 0),repmat(GK(i,arange()),concat([1,1,D])))
                        ti=Time(i)
                        lambdai=muest(ui)
                        pii=muest(ui)
                        pij=[]
                        if i > 1:
                            tj=Time(arange(1,i - 1))
                            uj=Event(arange(1,i - 1))
                            dt=ti - tj
                            gij=Kernel(dt,model)
                            auiuj=Aest(uj,arange(),ui)
                            pij=multiply(auiuj,gij)
                            lambdai=lambdai + sum(ravel(pij))
                        NLL=NLL - log(lambdai)
                        pii=pii / lambdai
                        if i > 1:
                            pij=pij / lambdai
                            if logical_not(isempty(pij)) and sum(ravel(pij)) > 0:
                                for j in arange(1,length(uj)).reshape(-1):
                                    uuj=uj(j)
                                    CmatA[uuj,arange(),ui]=CmatA(uuj,arange(),ui) - pij(j,arange())
                        Bmu[ui]=Bmu(ui) + pii
                    NLL=NLL + multiply((Tstop - Tstart),sum(muest))
                    NLL=NLL + sum(sum(multiply(GK,sum(Aest(Event,arange(),arange()),3))))
                else:
                    warning('Sequence %d is empty!',c)
            # M-step: update parameters
            mu=Bmu / Amu
            if alg.Sparse == 0 and alg.GroupSparse == 0 and alg.LowRank == 0:
                A=- CmatA / BmatA
                A[isnan(A)]=0
                A[isinf(A)]=0
            else:
                A=(- BmatA + sqrt(BmatA ** 2 - multiply(dot(4,AmatA),CmatA))) / (dot(2,AmatA))
                A[isnan(A)]=0
                A[isinf(A)]=0
            # check convergence
            Err=sum(sum(sum(abs(A - Aest)))) / sum(abs(ravel(Aest)))
            Aest=copy(A)
            muest=copy(mu)
            model.A = copy(Aest)
            model.mu = copy(muest)
            print('Outer=%d, Inner=%d, Obj=%f, RelErr=%f\n',o,n,NLL,Err)
            if Err < alg.thres or (o == alg.outer and n == alg.inner):
                break
        # store loglikelihood
        if alg.storeLL:
            Loglike=Loglike_Basis(Seqs,model,alg)
            model.LL[o]=Loglike
        # calculate error
        if alg.storeErr:
            Err=zeros(1,3)
            Err[1]=norm(ravel(model.mu) - ravel(alg.truth.mu)) / norm(ravel(alg.truth.mu))
            Err[2]=norm(ravel(model.A) - ravel(alg.truth.A)) / norm(ravel(alg.truth.A))
            Err[3]=norm(concat([[ravel(model.mu)],[ravel(model.A)]]) - concat([[ravel(alg.truth.mu)],[ravel(alg.truth.A)]])) / norm(concat([[ravel(alg.truth.mu)],[ravel(alg.truth.A)]]))
            model.err[o,arange()]=Err
        if alg.LowRank:
            threshold=alg.alphaLR / rho
            ZL=SoftThreshold_LR(Aest + UL,threshold)
            UL=UL + (Aest - ZL)
        if alg.Sparse:
            threshold=alg.alphaS / rho
            ZS=SoftThreshold_S(Aest + US,threshold)
            US=US + (Aest - ZS)
        if alg.GroupSparse:
            threshold=alg.alphaGS / rho
            ZG=SoftThreshold_GS(Aest + UG,threshold)
            UG=UG + (Aest - ZG)

    