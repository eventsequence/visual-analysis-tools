# Generated with SMOP  0.41
import numpy as np

def Loglike_Basis(Seqs=None,model=None,alg=None):
    Aest=model["A"]
    muest=model["mu"]
    Loglike=0
    # E-step: evaluate the responsibility using the current parameters
    for c in range(0,len(Seqs)):
        Time=Seqs[c]["Time"]
        Event=Seqs[c]["Mark"]
        Tstart=Seqs[c]["Start"]
        if isempty(alg["Tmax"]):
            Tstop=Seqs[c]["Stop"]
        else:
            Tstop=alg["Tmax"]
            indt=Time < alg["Tmax"]
            Time=Time[indt]
            Event=Event[indt]
        dT=Tstop - Time
        GK=Kernel_Integration(dT,model)
        Nc=len(Time)
        for i in range(0,Nc):
            ui=Event[i]
            ti=Time[i]
            lambdai=muest(ui)
            if i > 0:
                tj=Time(arange(0,i - 1))
                uj=Event(arange(0,i - 1))
                dt=ti - tj
                gij=Kernel(dt,model)
                auiuj=Aest(uj,arange(),ui)
                pij=np.multiply(auiuj,gij)
                lambdai=lambdai + sum(ravel(pij))
            Loglike=Loglike - log(lambdai)
        Loglike=Loglike + np.multiply((Tstop - Tstart),sum(muest))
        Loglike=Loglike + sum(sum(np.multiply(GK,sum(Aest(Event,arange(),arange()),3))))
    Loglike=- Loglike
