//global variables stored here
var Data = {};

Data.seqs={};
Data.sseq={};
Data.alignment={};
Data.top_seqs=[];

Data.meanseq=[];
Data.meanseqStage=[];

Data.profile={};

Data.idx2type=[];
Data.idx2label=[];

Data.abid="";
Data.simnum=35;

Data.min_layer_gap=100;
Data.layer_gap=100;
Data.default_gap=100;
Data.default_canvas=0;
Data.canvas_width=0;

Data.scrollDomain=[];

Data.selectlist=[];
Data.alllist=[];

Data.malePics=111;
Data.femalePics=87;

Data.maleName="Tony";
Data.femaleName="Mary";

Data.distance={}

Data.event2idx={}
Data.idx2event={}

Data.seq_diff=[]
Data.sseq_diff=[]
Data.seq_common=[]

Data.overlay=true;
Data.prop_range=0.5;
Data.minNode=30;

Data.stage=[]
Data.stage_expand=[];

Data.slotids=[]

Data.tsne=[]

Data.anomaly_id=[]

Data.conf=0.5;

Data.treeSize=[35,24];

Data.circleSize=35;

Data.viewStatus='overlay';

Data.triSwitch='sankey';

Data.zoom=false;

Data.passid=[
'54082',
'64573',
'18971',
'65915',
'52370',
'69293',
'67104',
'88514',
'68184',
'19067',
'27597',
'43599',
'44666',
'70133',
'59936',
'76698',
'40689',
'51385',
'90040',
'69162',
'65915',
'77067',
'55703',
'40797',
'98994',
'49846',
'85310',
'94079',
'98494',
'54782',
'56243',
'57815',
'25157',
'54757',
'73770',
'41192',
'72000',
'54900',
'99982',
'46415',
'55973',
'31260',
'62833',
'82360',
'90990',
'12122',
'99830',
'84206',
'61179',
'67653',


'94525',
'79015',
'124',
'63031',
'94530',
'84130',
'59333',
'83182',
'57572',
'88078',
'29142',
'65611',
'60432',
'58128',
'89168',
'58774',
'91711'

]

Data.sid=['69162','67413','99166','22520','67067','52641','78966','68475','96592','55781','59373','96928','75782','86810','53459','62371','4313'];